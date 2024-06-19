import {computed, reactive, ref} from "vue";
import {
    calcFileHash,
    isFileSystemDirectoryHandle,
    isFileSystemFileHandle,
    readableFileSize,
    readTextFileContent,
    resolveAllFiles,
    resolveFileCountInTreeNode,
    uploadFile,
} from "@/utils"
import type {SortMethod, TreeItem, UploadState} from "@/types";
import {message} from 'ant-design-vue'
import {addNewFile, loadCache, publishCache, saveCache} from "@/stores/publish-cache";
import {loadManifest, publishManifest, saveManifest} from "@/stores/publish-manifest"
import {parseMarkdown} from "@/parser";


export let treeNodes = reactive<TreeItem[]>([])
export let vaultName = ref('')

export const hideEmptyDir = ref(false)
export const showFileSize = ref(false)
export const sort = ref<SortMethod>('A-Z')

let rootDirectoryHandle: FileSystemDirectoryHandle | null = null


let optionsFileHandle: FileSystemFileHandle | null = null


// 选择仓库目录
export async function selectDirectory() {
    try {
        rootDirectoryHandle = await window.showDirectoryPicker({mode: 'readwrite'})
    } catch (e: any) {
        console.warn(e)
        message.warn(e.message)
        return
    }

    // 检查选择的目录是否是仓库目录(仓库目录下会有一个 .obsidian 目录)
    try {
        const obsidianDirectoryHandle = await rootDirectoryHandle.getDirectoryHandle('.obsidian')
        await loadCache(obsidianDirectoryHandle)
        await loadManifest(obsidianDirectoryHandle)
    } catch (e: any) {
        if (e.name === 'NotFoundError') {
            message.error('选择的目录不是一个合法的仓库目录(仓库目录通常会包含一个 .obsidian 隐藏目录)')
        } else {
            console.error(e)
            message.error(e.message)
        }
        return
    }

    vaultName.value = rootDirectoryHandle.name

    let nodes = await convertDirectoryToTreeNodes(rootDirectoryHandle)
    resolveFileCountInTreeNode(nodes)

    treeNodes.length = 0
    treeNodes.push(...nodes)
}


let _id = 0

/**
 * 递归解析目录下面的所有文件，组成树状结构返回
 */
async function convertDirectoryToTreeNodes(directoryHandle: FileSystemDirectoryHandle, level = 0, path: number[] = []) {
    const nodes: TreeItem[] = []

    for await (const handle of directoryHandle.values()) {
        // 忽略顶层目录下面的隐藏文件/目录
        if (level === 0 && handle.name.startsWith('.')) {
            continue
        }
        let id = _id++

        if (isFileSystemFileHandle(handle)) {
            const currentFilePath = await rootDirectoryHandle!.resolve(handle)

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
                checked: false,
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
                children: await convertDirectoryToTreeNodes(handle, level + 1, path.concat(id)),
                fileCount: 0,
            })
        }
    }

    return nodes
}


// 上传文件
export const isPublishing = ref(false)

export async function upload() {
    isPublishing.value = true

    for (const fileItem of checkedFiles.value) {
        if (fileItem.uploadState === 'synced') {
            continue
        }

        fileItem.uploadState = 'uploading'

        try {
            const file = fileItem.file
            const path = fileItem.path.join('/')
            await uploadFile(file, path)

            // md 文件需要解析
            if (fileItem.path.join('/').endsWith('.md')) {
                const doc = await readTextFileContent(file)
                publishManifest[path] = parseMarkdown(doc)
            } else {
                publishManifest[path] = null
            }

            fileItem.uploadState = 'synced'
            await addNewFile(fileItem)
        } catch (e) {
            // 上传出错
            console.error(e)
            fileItem.uploadState = 'failed'
        }
    }

    // 已上传文件数据写入磁盘缓存
    publishCache!.lastPublishAt = Date.now()
    await saveCache()

    await saveManifest()

    // 上传 manifest 文件
    await uploadFile(JSON.stringify(publishManifest), 'manifest.json')

    isPublishing.value = false
    // message.success('上传完毕')
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
