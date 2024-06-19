// 仓库根目录句柄
export let vaultDirectoryHandle: FileSystemDirectoryHandle


/**
 * 选择 obsidian 仓库目录
 */
export async function selectVault(): Promise<FileSystemDirectoryHandle> {
    let directoryHandle: FileSystemDirectoryHandle
    try {
        directoryHandle = await window.showDirectoryPicker({mode: 'readwrite'})

        // 检查选择的目录是否是仓库目录(仓库目录下会有一个 .obsidian 目录)
        await directoryHandle.getDirectoryHandle('.obsidian')
        vaultDirectoryHandle = directoryHandle

        return directoryHandle
    } catch (e: any) {
        if (e.name === 'NotFoundError') {
            throw new Error('选择的目录不是一个合法的仓库目录(仓库目录通常会包含一个 .obsidian 隐藏目录)')
        } else {
            throw e
        }
    }
}


/**
 * 把路径解析到最终的目标文件句柄
 * @param path 文件路径
 * @param create 不存在时是否创建
 */
async function resolveTargetFileHandle(path: string, create = false) {
    if (!vaultDirectoryHandle) {
        throw new Error('未选择仓库')
    }

    let targetFileHandle: FileSystemFileHandle
    const segments = path.split('/')
    if (segments.length === 1) {
        targetFileHandle = await vaultDirectoryHandle.getFileHandle(path, {create})
    } else {
        let currentDirectoryHandle = vaultDirectoryHandle
        for (let i = 0; i < segments.length-1; i++) {
            currentDirectoryHandle = await currentDirectoryHandle.getDirectoryHandle(segments[i], {create})
        }
        targetFileHandle = await currentDirectoryHandle.getFileHandle(segments.at(-1)!, {create})
    }

    return targetFileHandle
}

/**
 * 读取磁盘文件内容
 * @param path 相对于仓库根目录的路径
 */
export async function readDiskFileContent(path: string) {
    try {
        const targetFileHandle = await resolveTargetFileHandle(path)
        return await readFileContent(targetFileHandle)
    } catch (e: any) {
        return null
    }
}

/**
 * 写入磁盘文件
 * @param path 相对于仓库根目录的路径
 * @param content 内容
 */
export async function writeDiskFileContent(path: string, content: string) {
    const targetFileHandle = await resolveTargetFileHandle(path, true)
    await writeFileContent(targetFileHandle, content)
}

/**
 * 读取文件内容
 */
async function readFileContent(fileHandle: FileSystemFileHandle): Promise<string> {
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
async function writeFileContent(fileHandle: FileSystemFileHandle, content: string) {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}

export function isFileSystemFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
    return handle.kind === 'file'
}
export function isFileSystemDirectoryHandle(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
    return handle.kind === 'directory'
}
