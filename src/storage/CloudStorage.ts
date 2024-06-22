import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client
} from "@aws-sdk/client-s3";
import {S3StorageOptions} from "@/types";
import mime from 'mime'


export default class CloudStorage {
    private s3: S3Client
    private options: S3StorageOptions


    constructor(options: S3StorageOptions) {
        this.options = options

        let region = ''
        let endpoint = ''
        if (options.provider === 'qiniu') {
            region = options.region
            endpoint = `https://s3.${options.region}.qiniucs.com`
        } else if (options.provider === 'R2') {
            region = 'auto'
            endpoint = `https://${options.accountID}.r2.cloudflarestorage.com`
        }

        if (!region || !endpoint || !options.accessKeyID || !options.secretAccessKey) {
            throw new Error('options配置不正确')
        }

        this.s3 = new S3Client({
            region: region,
            endpoint: endpoint,
            credentials: {
                accessKeyId: options.accessKeyID,
                secretAccessKey: options.secretAccessKey,
            },
        });
    }

    /**
     * 获取对象信息
     * @param key
     */
    headObject(key: string) {
        return this.s3.send(
            new HeadObjectCommand({
                Bucket: this.options.bucketName,
                Key: key,
            })
        )
    }

    /**
     * 单文件上传
     * @param file
     * @param key
     */
    putObject(file: File | string, key: string) {
        let contentType = mime.getType(key)!
        if (contentType.startsWith('text/')) {
            contentType += '; charset=utf-8'
        }
        return this.s3.send(
            new PutObjectCommand({
                Bucket: this.options.bucketName,
                Key: key,
                Body: file,
                ContentType: contentType,
            })
        )
    }

    /**
     * 删除对象
     * @param key
     */
    deleteObject(key: string) {
        return this.s3.send(
            new DeleteObjectCommand({
                Bucket: this.options.bucketName,
                Key: key,
            })
        )
    }

    /**
     * 批量删除对象
     * @param keys
     */
    deleteObjects(keys: string[]) {
        return this.s3.send(
            new DeleteObjectsCommand({
                Bucket: this.options.bucketName,
                Delete: {
                    Objects: keys.map(key => ({Key: key}))
                }
            })
        )
    }
}
