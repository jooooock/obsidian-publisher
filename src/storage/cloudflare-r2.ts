import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3'
import {StorageOptions} from "@/types"

export async function uploadFile(file: File, path: string, auth: Pick<StorageOptions, 'accountID' | 'accessKeyID' | 'secretAccessKey' | 'bucketName'>) {
    const client = new S3Client({
        region: 'auto',
        endpoint: `https://${auth.accountID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: auth.accessKeyID,
            secretAccessKey: auth.secretAccessKey,
        },
    })
    const command = new PutObjectCommand({
        Bucket: auth.bucketName,
        Body: file,
        Key: path,
    })

    return await client.send(command)
}
