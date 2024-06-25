import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    HeadObjectCommand,
    PutObjectCommand,
    GetObjectCommand,
    S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {S3StorageOptions} from "@/types";
import mime from 'mime'


export default class CloudStorage {
    private readonly s3: S3Client
    private options: S3StorageOptions


    constructor(options: S3StorageOptions) {
        if (!options.region || !options.endpoint || !options.accessKeyID || !options.secretAccessKey) {
            throw new Error('options配置不正确')
        }

        this.options = options
        this.s3 = new S3Client({
            region: options.region,
            endpoint: options.endpoint,
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

    async getAccessURL(key: string) {
        return await getSignedUrl(this.s3, new GetObjectCommand({
            Bucket: this.options.bucketName,
            Key: key,
        }), {
            expiresIn: 3600,
        })
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
