import mime from 'mime'
import type {TreeItem, TreeItemDirectory, TreeItemFile} from "@/types";
import sha256 from 'crypto-js/sha256';
import hex from 'crypto-js/enc-hex'
import * as qiniu from '@/storage/qiniu'

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


/**
 * 上传文件
 * @param file 文件对象或文件内容
 * @param path 文件保存路径
 */
export async function uploadFile(path: string, file: File | string) {
    let fileObj: File
    if (typeof file === 'string') {
        const fileName = path.split('/').at(-1)!
        fileObj = new File([file], fileName, {type: mime.getType(path)!})
    } else if (file instanceof File) {
        fileObj = file
    } else {
        throw new Error('file参数格式不正确')
    }

    try {
        const token = await qiniu.getUploadToken(path)
        return await qiniu.uploadFile(fileObj, path, token)
    } catch (e: any) {
        throw e
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
 * 计算目录包含的文件数
 */
export function resolveFileCountInTreeNode(treeNodes: TreeItem[]) {
    travelTreeDirectoryNodes(treeNodes, (node) => {
        node.fileCount = resolveAllFiles(node.children).length
    })
}

/**
 * 计算文件hash
 * @param file
 */
export async function calcFileHash(file: File) {
    const fileType = mime.getType(file.name)
    if (fileType && fileType.startsWith('text/')) {
        // 文本文件可以计算真正的 hash
        const text = await readTextFileContent(file)
        return sha256(text).toString(hex)
    } else {
        // 二进制文件可能会比较大，用 lastModified + size 组合代替 hash
        return `${file.lastModified}${file.size}`
    }
}

/**
 * 读取文件的文本内容
 * @param file
 */
export function readTextFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.addEventListener('load', event => {
            resolve(event.target!.result as string)
        })
        reader.addEventListener('error', reject)
        reader.readAsText(file, 'utf-8')
    })
}
