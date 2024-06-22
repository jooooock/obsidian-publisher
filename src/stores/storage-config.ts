import {reactive, ref} from "vue";
import {S3StorageOptions} from '@/types'
import CloudStorage from "@/storage/CloudStorage";


export const s3Provider = ref('')
export let cloudStorage: CloudStorage | null = null

/**
 * 初始化 S3 客户端
 * @param options
 */
export function initCloudStorage(options: S3StorageOptions) {
    cloudStorage = new CloudStorage(options)
    s3Provider.value = options.provider!
}
