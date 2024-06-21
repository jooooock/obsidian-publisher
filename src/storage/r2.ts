import {S3Client, ListBucketsCommand, ListObjectsV2Command} from '@aws-sdk/client-s3'

const ACCOUNT_ID = '51f72fc4cd1ef967d60f842a6b80b1f7'
const ACCESS_KEY_ID = 'dc12bf9a1dec8bb7652884d8b83452f1'
const SECRET_ACCESS_KEY = '2a5e56666b632b1b8f029d890f0a77b8b41bc07f7a3a8e05ed27556a885b12b5'

export async function listObjects() {
    const client = new S3Client({
        region: 'auto',
        endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: ACCESS_KEY_ID,
            secretAccessKey: SECRET_ACCESS_KEY,
        },
    })
    const command = new ListObjectsV2Command({Bucket: 'obsidian-publish'})

    try {
        const data = await client.send(command)
        console.log(data)
    } catch (e) {

    }
}
