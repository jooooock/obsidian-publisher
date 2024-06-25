import {computed, reactive, ref} from "vue";
import { notification } from 'ant-design-vue'
import {
    calcFileHash,
    readableFileSize,
    readTextFileContent,
    resolveAllFiles,
    resolveFileCountInTreeNode,
} from "@/utils"
import type {SortMethod, TreeItem, UploadState} from "@/types";
import {addNewFile, deleteFile, loadCache, publishCache, saveCache} from "@/stores/publish-cache";
import {loadManifest, publishManifest, saveManifest} from "@/stores/publish-manifest"
import {initCloudStorage, cloudStorage} from '@/stores/storage-config'
import {parseMarkdown} from "@/parser"
import {selectVault, isFileSystemDirectoryHandle, isFileSystemFileHandle, readDiskFileContent} from '@/stores/fs'


export let treeNodes = reactive<TreeItem[]>([])
export let vaultName = ref('')

export const hideEmptyDir = ref(false)
export const showFileSize = ref(false)
export const sort = ref<SortMethod>('A-Z')



// 选择仓库目录
export async function selectDirectory() {
    let vaultDirectoryHandle: FileSystemDirectoryHandle

    try {
        vaultDirectoryHandle = await selectVault()

        await loadCache()
        await loadManifest()

        const s3Options = await readDiskFileContent('.obsidian/publisher/s3.json')
        if (s3Options) {
            initCloudStorage(JSON.parse(s3Options))
        }
    } catch (e: any) {
        console.warn(e)
        notification.warning({
            message: e.message,
        });
        return
    }

    vaultName.value = vaultDirectoryHandle.name

    let nodes = await convertDirectoryToTreeNodes(vaultDirectoryHandle, vaultDirectoryHandle)
    resolveFileCountInTreeNode(nodes)

    treeNodes.length = 0
    treeNodes.push(...nodes)
}


let _id = 0

/**
 * 递归解析目录下面的所有文件，组成树状结构返回
 */
async function convertDirectoryToTreeNodes(rootHandle: FileSystemDirectoryHandle, directoryHandle: FileSystemDirectoryHandle, level = 0, path: number[] = []) {
    const nodes: TreeItem[] = []

    for await (const handle of directoryHandle.values()) {
        // 忽略顶层目录下面的隐藏文件/目录
        if (level === 0 && handle.name.startsWith('.')) {
            continue
        }
        let id = _id++

        if (isFileSystemFileHandle(handle)) {
            const currentFilePath = await rootHandle.resolve(handle)

            let fileUploadState: UploadState = ''
            const fileCache = publishCache.files.find(file => file.path.join('/') === currentFilePath!.join('/'))
            if (fileCache) {
                const hash = await calcFileHash(await handle.getFile())
                if (fileCache.hash === hash) {
                    fileUploadState = 'synced'
                } else {
                    fileUploadState = 'dirty'
                }
            }

            nodes.push({
                pid: path.concat(id),
                id: id,
                kind: 'file',
                name: handle.name,
                level: level,
                checked: !!fileCache,
                file: await handle.getFile(),
                path: currentFilePath!,
                uploadState: fileUploadState,
            })
        } else if (isFileSystemDirectoryHandle(handle)) {
            nodes.push({
                pid: path.concat(id),
                id: id,
                kind: 'directory',
                name: handle.name,
                level: level,
                collapsed: true,
                checked: false,
                children: await convertDirectoryToTreeNodes(rootHandle, handle, level + 1, path.concat(id)),
                fileCount: 0,
            })
        }
    }

    return nodes
}


// 上传文件
export const isPublishing = ref(false)

export async function publish() {
    if (!cloudStorage) {
        notification.warning({
            message: '请先进行存储配置',
        });
        return
    }

    isPublishing.value = true
    let canContinue = true

    // 处理上传文件
    for (const fileItem of checkedFiles.value) {
        if (fileItem.uploadState === 'synced') {
            continue
        }

        fileItem.uploadState = 'uploading'

        try {
            const file = fileItem.file
            const path = fileItem.path.join('/')
            await cloudStorage.putObject(file, path)

            // 解析文件元数据
            if (path.endsWith('.md')) {
                const doc = await readTextFileContent(file)
                publishManifest[path] = parseMarkdown(doc)
            } else {
                publishManifest[path] = null
            }

            fileItem.uploadState = 'synced'
            await addNewFile(fileItem)
        } catch (e: any) {
            // 上传出错
            console.error(e)
            fileItem.uploadState = 'failed'

            notification.error({
                message: '文件上传失败',
                description: e.message,
            });

            if (e.message.includes('配置') || e.message.includes('Failed to fetch') || e.message.includes('Invalid URL')) {
                canContinue = false
                break
            }
        }
    }

    // 处理删除文件
    for (const fileItem of deleteUploadFiles.value) {
        fileItem.uploadState = 'uploading'

        try {
            const file = fileItem.file
            const path = fileItem.path.join('/')
            await cloudStorage.deleteObject(path)
            delete publishManifest[path]

            fileItem.uploadState = ''
            deleteFile(fileItem)
        } catch (e: any) {
            // 删除出错
            console.error(e)
            fileItem.uploadState = 'failed'

            notification.error({
                message: '文件删除失败',
                description: e.message,
            });

            if (e.message.includes('配置') || e.message.includes('Failed to fetch') || e.message.includes('Invalid URL')) {
                canContinue = false
                break
            }
        }
    }

    if (!canContinue) {
        // 如果出现了配置类错误，则结束上传过程
        isPublishing.value = false
        return
    }

    // 已上传文件数据写入磁盘缓存
    publishCache!.lastPublishAt = Date.now()
    await saveCache()

    await saveManifest()

    try {
        // 上传 manifest 文件
        await cloudStorage.putObject(JSON.stringify(publishManifest), 'manifest.json')
        notification.success({
            message: '发布完成',
        });
    } catch (e: any) {
        notification.error({
            message: `manifest.json 文件上传失败: ${e.message}`,
        });
    }

    isPublishing.value = false
}


export async function parse() {
    for (const entry of checkedMarkdownFiles.value) {
        console.log(entry.path.join('/'))
        const content = await readTextFileContent(entry.file)
        console.log(content)
        debugger
        const nodes = parseMarkdown(content)
        console.log(nodes)
    }
}

// 仓库中的总文件数
export const totalFilesCount = computed(() => {
    return resolveAllFiles(treeNodes).length
})
// 选中文件数
export const checkedFilesCount = computed(() => {
    return checkedFiles.value.length
})
// 已选中的文件列表
export const checkedFiles = computed(() => {
    return resolveAllFiles(treeNodes).filter(entry => entry.checked)
})
// 已选中文件的总大小
export const totalFileSize = computed(() => {
    return readableFileSize(resolveAllFiles(treeNodes).filter(entry => entry.checked).reduce((total, item) => total + item.file.size, 0))
})
// 已上传文件的总大小
export const uploadedFilesSize = computed(() => {
    return readableFileSize(resolveAllFiles(treeNodes).filter(entry => entry.uploadState === 'synced').reduce((total, item) => total + item.file.size, 0))
})
// 正在上传的文件
export const uploadingFileEntry = computed(() => {
    return resolveAllFiles(treeNodes).find(entry => entry.uploadState === 'uploading')
})
// 已上传文件数
export const syncedFilesCount = computed(() => {
    return resolveAllFiles(treeNodes).filter(entry => entry.uploadState === 'synced').length
})
// 已上传文件占选中文件的百分比
export const uploadPercent = computed(() => Math.floor(syncedFilesCount.value / checkedFilesCount.value * 100))
// 新增上传文件数
export const newUploadFilesCount = computed(() => {
    return checkedFiles.value.filter(entry => entry.uploadState !== 'dirty' && entry.uploadState !== 'synced').length
})
// 要删除的文件列表
export const deleteUploadFiles = computed(() => {
    return resolveAllFiles(treeNodes).filter(entry => !entry.checked && (entry.uploadState === 'synced' || entry.uploadState === 'dirty'))
})
// 删除上传文件数
export const deleteUploadFilesCount = computed(() => {
    return deleteUploadFiles.value.length
})
// 选中的 markdown 文件
export const checkedMarkdownFiles = computed(() => {
    return checkedFiles.value.filter(entry => entry.name.endsWith('.md'))
})
