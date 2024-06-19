import {reactive} from "vue";
import {readDiskFileContent, writeDiskFileContent} from "@/stores/fs";


export const publishManifest = reactive<Record<string, any>>({})


/**
 * 加载清单数据
 */
export async function loadManifest() {
    // 清空
    Object.assign(publishManifest, {})


    const content = await readDiskFileContent(".obsidian/publisher/manifest.json")
    if (content) {
        Object.assign(publishManifest, JSON.parse(content))
    }
}


/**
 * 保存缓存
 */
export async function saveManifest() {
    await writeDiskFileContent('.obsidian/publisher/manifest.json', JSON.stringify(publishManifest, null, 2))
    console.log('发布清单写入磁盘')
}
