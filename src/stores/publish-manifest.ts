import {readFileContent, writeFileContent} from "@/utils";
import {reactive} from "vue";

export const publishManifest = reactive<Record<string, any>>({})

let publishManifestFileHandle: FileSystemFileHandle | null = null

/**
 * 加载清单数据
 * @param obsidianDirectoryHandle .obsidian目录句柄
 */
export async function loadManifest(obsidianDirectoryHandle: FileSystemDirectoryHandle) {
    publishManifestFileHandle = await obsidianDirectoryHandle.getFileHandle('.publish_manifest.json', {create: true})

    const publishManifestContent = await readFileContent(publishManifestFileHandle)
    const result = JSON.parse(publishManifestContent || '{}')
    Object.assign(publishManifest, result)
}


/**
 * 保存缓存
 */
export async function saveManifest() {
    console.log('开始同步到磁盘缓存')
    await writeFileContent(publishManifestFileHandle!, JSON.stringify(publishManifest, null, 2))
    console.log('写入完毕')
}
