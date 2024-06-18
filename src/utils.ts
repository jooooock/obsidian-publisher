import * as qiniuJS from 'qiniu-js'
import mime from 'mime'
import type {TreeItem, TreeItemDirectory, TreeItemFile} from "@/types";


/**
 * 格式化文件大小
 * @param bytes 字节数
 */
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

// 上传文件
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

/**
 * 遍历树中的目录节点
 */
export function travelTreeDirectoryNodes(treeNodes: TreeItem[], fn: (node: TreeItemDirectory) => void) {
    treeNodes.forEach(node => {
        if (node.kind === 'directory') {
            fn(node)

            travelTreeDirectoryNodes(node.children, fn)
        }
    })
    return treeNodes
}

/**
 * 读取文件内容
 */
export async function readFileContent(fileHandle: FileSystemFileHandle): Promise<string> {
    return new Promise(async (resolve, reject) => {
        if (fileHandle) {
            const file = await fileHandle.getFile()
            const fileReader = new FileReader()
            fileReader.addEventListener('load', event => {
                try {
                    const result = event.target!.result as string
                    resolve(result)
                } catch (e) {
                    reject(e)
                }
            })
            fileReader.addEventListener('error', reject)
            fileReader.readAsText(file, 'utf-8')
        } else {
            reject(new Error('file handle is empty'))
        }
    })
}

/**
 * 写入文件内容
 */
export async function writeFileContent(fileHandle: FileSystemFileHandle, content: string) {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}

/**
 * 计算目录包含的文件数
 */
export function resolveFileCountInTreeNode(treeNodes: TreeItem[]) {
    travelTreeDirectoryNodes(treeNodes, (node) => {
        node.fileCount = resolveAllFiles(node.children).length
    })
}
