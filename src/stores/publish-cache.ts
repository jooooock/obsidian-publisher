import type {PublishCache, TreeItemFile} from "@/types";
import {calcFileHash} from "@/utils";
import {reactive} from "vue";
import {readDiskFileContent, writeDiskFileContent} from '@/stores/fs'


export const publishCache = reactive<PublishCache>({
    files: [],
    lastPublishAt: 0
})

/**
 * 加载缓存
 */
export async function loadCache() {
    // 清空
    publishCache.files.length = 0
    publishCache.lastPublishAt = 0


    const content = await readDiskFileContent('.obsidian/publisher/cache.json')
    if (content) {
        Object.assign(publishCache, JSON.parse(content))
    }
}

/**
 * 添加新文件
 * @param fileEntry
 */
export async function addNewFile(fileEntry: TreeItemFile) {
    const targetFile = publishCache.files.find(file => file.path.join('/') === fileEntry.path.join('/'))
    if (targetFile) {
        // 更新hash
        targetFile.hash = await calcFileHash(fileEntry.file)
    } else {
        publishCache.files.push({
            path: fileEntry.path,
            hash: await calcFileHash(fileEntry.file)
        })
    }
}

/**
 * 删除文件
 * @param fileEntry
 */
export function deleteFile(fileEntry: TreeItemFile) {
    const targetFileIndex = publishCache.files.findIndex(file => file.path.join('/') === fileEntry.path.join('/'))
    if (targetFileIndex !== -1) {
        publishCache.files.splice(targetFileIndex, 1)
    }
}

/**
 * 保存缓存
 */
export async function saveCache() {
    await writeDiskFileContent('.obsidian/publisher/cache.json', JSON.stringify(publishCache, null, 2))
    console.log('发布缓存写入磁盘')
}
