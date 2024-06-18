import * as qiniuJS from 'qiniu-js'
import mime from 'mime'
import {TreeItem, TreeItemFile} from "@/types";

export function readableFileSize(bytes: number) {
    if (bytes < 1024 ** 1) {
        return `${bytes} B`
    } else if (bytes < 1024 ** 2) {
        return `${(bytes / (1024 ** 1)).toFixed(2)} KB`
    } else if (bytes < 1024 ** 3) {
        return `${(bytes / (1024 ** 2)).toFixed(2)} MB`
    } else if (bytes < 1024 ** 4) {
        return `${(bytes / (1024 ** 3)).toFixed(2)} GB`
    } else {
        return 'large file'
    }
}

let host = ''
if (import.meta.env.DEV) {
    host = 'http://localhost:8000'
}

export async function uploadFile(fileEntry: TreeItemFile) {
    const file = fileEntry.file
    const filePath = fileEntry.path.join('/')

    if (filePath.endsWith('.md')) {
        // md 文档通过服务器上传
        const formData = new FormData()
        formData.set('file', file)
        formData.set('path', filePath)

        return fetch(`${host}/api/storage/upload`, {
            method: 'post',
            body: formData,
        }).then(resp => resp.json())
    } else {
        // 资源文件直接上传到七牛云
        const {code, data: token, msg} = await fetch(`${host}/api/qiniu/token?path=${encodeURIComponent(filePath)}`, {
            method: 'get',
        }).then(resp => resp.json())
        if (code !== 0) {
            // token 获取失败
            return {code: code, msg: msg}
        }

        const uploadResult = new Promise((resolve, reject) => {
            const observable = qiniuJS.upload(file, filePath, token, {
                mimeType: mime.getType(filePath)!,
            })
            observable.subscribe({
                error(err) {
                    reject(err);
                },
                complete(res) {
                    resolve(res)
                },
            });
        })

        try {
            const res = await uploadResult

            // 由于用 callbackUrl/callbackBody 的方式后端收不到回调，所以改为前端手动通知服务端
            return await fetch(`${host}/api/qiniu/upload/callback`, {
                method: 'post',
                body: JSON.stringify(res),
                headers: {
                    "Content-Type": "application/json",
                }
            }).then(resp => resp.json())
        } catch (e: any) {
            return {code: 1, msg: e.message}
        }
    }
}

/**
 * 递归获取指定树节点下的所有文件
 */
export function resolveAllFiles(children: TreeItem[]) {
    const fileEntries: TreeItemFile[] = []
    children.forEach(entry => {
        if (entry.kind === 'file') {
            fileEntries.push(entry)
        } else {
            fileEntries.push(...resolveAllFiles(entry.children))
        }
    })
    return fileEntries
}

export function isFileSystemFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
    return handle.kind === 'file'
}
export function isFileSystemDirectoryHandle(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
    return handle.kind === 'directory'
}
