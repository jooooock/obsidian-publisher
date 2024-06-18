import {computed, reactive, ref} from "vue";
import {
    isFileSystemDirectoryHandle,
    isFileSystemFileHandle,
    readableFileSize,
    readFileContent,
    resolveAllFiles,
    resolveFileCountInTreeNode,
    uploadFile,
    writeFileContent
} from "@/utils"
import type {PublishCache, SortMethod, TreeItem} from "@/types";
import {message} from 'ant-design-vue'


export let treeNodes = reactive<TreeItem[]>([])
export let vaultName = ref('')

export const hideEmptyDir = ref(false)
export const showFileSize = ref(false)
export const sort = ref<SortMethod>('A-Z')

let rootDirectoryHandle: FileSystemDirectoryHandle | null = null
let publishCacheFileHandle: FileSystemFileHandle | null = null
let manifestFileHandle: FileSystemFileHandle | null = null
let optionsFileHandle: FileSystemFileHandle | null = null

let _publishCache: PublishCache | null = null


// 选择仓库目录
export async function selectDirectory() {
    try {
        rootDirectoryHandle = await window.showDirectoryPicker({mode: 'readwrite'})
    } catch (e) {
        console.warn(e)
        return
    }

    // 检查选择的目录是否是仓库目录(仓库目录下会有一个 .obsidian 目录)
    try {
        const obsidianDirectoryHandle = await rootDirectoryHandle.getDirectoryHandle('.obsidian')
        publishCacheFileHandle = await obsidianDirectoryHandle.getFileHandle('.publish_cache.json', {create: true})

        const publishCacheContent = await readFileContent(publishCacheFileHandle)
        _publishCache = JSON.parse(publishCacheContent || '{"files":[]}')
    } catch (e: any) {
        if (e.name === 'NotFoundError') {
            alert('选择的目录不是一个合法的仓库目录(仓库目录通常会包含一个 .obsidian 隐藏目录)')
        } else {
            console.error(e)
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
            const filePath = await rootDirectoryHandle!.resolve(handle)
            const hasUploaded = _publishCache!.files.some(file => file.path.join('/') === filePath!.join('/'))

            nodes.push({
                pid: path.concat(id),
                id: id,
                kind: 'file',
                name: handle.name,
                level: level,
                checked: false,
                file: await handle.getFile(),
                path: filePath!,
                uploadState: hasUploaded ? "synced" : '',
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
    const checkedFiles = resolveAllFiles(treeNodes).filter(entry => entry.checked)
    isPublishing.value = true

    const uploadData: PublishCache = {
        files: [],
        lastPublishAt: 0,
    }

    for (const entry of checkedFiles) {
        if (entry.uploadState === 'synced') {
            uploadData.files.push({
                path: entry.path,
                hash: '',
            })
            continue
        }

        entry.uploadState = 'uploading'

        try {
            const {code, msg} = await uploadFile(entry)
            if (code === 0) {
                entry.uploadState = 'synced'
                uploadData.files.push({
                    path: entry.path,
                    hash: '',
                })
            } else {
                console.warn(msg)
                entry.uploadState = 'failed'
            }
        } catch (e) {
            // 上传出错
            console.error(e)
            entry.uploadState = 'failed'
        }
    }

    // 已上传文件数据写入磁盘
    uploadData.lastPublishAt = Date.now()
    await writeFileContent(publishCacheFileHandle!, JSON.stringify(uploadData, null, 2))

    isPublishing.value = false
    message.success('上传完毕')
}


// 仓库中的总文件数
export const totalFilesCount = computed(() => {
    return resolveAllFiles(treeNodes).length
})
// 选中文件数
export const checkedFilesCount = computed(() => {
    return resolveAllFiles(treeNodes).filter(entry => entry.checked).length
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
