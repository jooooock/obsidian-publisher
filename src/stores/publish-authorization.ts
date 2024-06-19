import {reactive, ref} from "vue";
import {readDiskFileContent, writeDiskFileContent} from "@/stores/fs";


export interface SiteAuthorization {
    fetchTokenURL: string
    authorization: string
}

export const siteAuthorization: SiteAuthorization = reactive({
    fetchTokenURL: import.meta.env.DEV ? 'http://localhost:8000' : '',
    authorization: '',
})


export async function loadSiteAuthorization() {
    // 清空
    siteAuthorization.fetchTokenURL = import.meta.env.DEV ? 'http://localhost:8000' : ''
    siteAuthorization.authorization = ''


    const content = await readDiskFileContent('.obsidian/publisher/authorization.json')
    if (content) {
        Object.assign(siteAuthorization, JSON.parse(content))
    }
}

export async function saveSiteAuthorization() {
    await writeDiskFileContent('.obsidian/publisher/authorization.json', JSON.stringify(siteAuthorization, null, 2))
    console.log('网站认证信息写入磁盘')
}
