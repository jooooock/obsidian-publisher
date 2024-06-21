import {reactive} from "vue";
import {readDiskFileContent, writeDiskFileContent} from "@/stores/fs";
import {StorageOptions} from '@/types'


export const storageConfig: StorageOptions = reactive({
    provider: 'qiniu',
    fetchTokenURL: import.meta.env.DEV ? 'http://localhost:8000' : '',
    authorization: '',
    accountID: '',
    accessKeyID: '',
    secretAccessKey: '',
    bucketName: '',
})

export function isStorageConfigCorrect() {
    if (storageConfig.provider === 'qiniu') {
        return storageConfig.fetchTokenURL && storageConfig.authorization
    } else if (storageConfig.provider === 'R2') {
        return storageConfig.accountID && storageConfig.accessKeyID && storageConfig.secretAccessKey && storageConfig.bucketName
    } else {
        return false
    }
}

export async function loadSiteAuthorization() {
    // 清空
    storageConfig.provider = null
    storageConfig.fetchTokenURL = import.meta.env.DEV ? 'http://localhost:8000' : ''
    storageConfig.authorization = ''
    storageConfig.accountID = ''
    storageConfig.accessKeyID = ''
    storageConfig.secretAccessKey = ''


    const content = await readDiskFileContent('.obsidian/publisher/storage.json')
    if (content) {
        Object.assign(storageConfig, JSON.parse(content))
    }
}

export async function saveSiteAuthorization() {
    await writeDiskFileContent('.obsidian/publisher/storage.json', JSON.stringify(storageConfig, null, 2))
    console.log('网站认证信息写入磁盘')
}
