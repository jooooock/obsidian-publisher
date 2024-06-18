import type {PublishCache, TreeItemFile} from "@/types";
import {calcFileHash, readFileContent, writeFileContent} from "@/utils";
import {reactive} from "vue";

export const publishCache = reactive<PublishCache>({
    files: [],
    lastPublishAt: 0
})

let publishCacheFileHandle: FileSystemFileHandle | null = null

/**
 * 加载缓存
 * @param obsidianDirectoryHandle .obsidian目录句柄
 */
export async function loadCache(obsidianDirectoryHandle: FileSystemDirectoryHandle) {
    publishCacheFileHandle = await obsidianDirectoryHandle.getFileHandle('.publish_cache.json', {create: true})

    const publishCacheContent = await readFileContent(publishCacheFileHandle)
    const result = JSON.parse(publishCacheContent || '{"files":[], "lastPublishAt":0}')
    Object.assign(publishCache, result)
}

/**
 * 添加新文件
 * @param fileEntry
 */
export async function addNewFile(fileEntry: TreeItemFile) {
    const targetFile = publishCache!.files.find(file => file.path.join('/') === fileEntry.path.join('/'))
    if (targetFile) {
        // 更新hash
        targetFile.hash = await calcFileHash(fileEntry.file)
    } else {
        publishCache?.files.push({
            path: fileEntry.path,
            hash: await calcFileHash(fileEntry.file)
        })
    }
}

/**
 * 保存缓存
 */
export async function saveCache() {
    console.log('开始同步到磁盘缓存')
    await writeFileContent(publishCacheFileHandle!, JSON.stringify(publishCache, null, 2))
    console.log('写入完毕')
}
