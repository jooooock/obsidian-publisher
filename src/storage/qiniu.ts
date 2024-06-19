import * as qiniuJS from "qiniu-js";
import mime from "mime";


let host = ''
if (import.meta.env.DEV) {
    host = 'http://localhost:8000'
}

/**
 * 获取资源上传token
 * @param filePath 文件保存路径
 */
export async function getUploadToken(filePath: string): Promise<string> {
    const {code, data: token, msg} = await fetch(`${host}/api/qiniu/token?path=${encodeURIComponent(filePath)}`, {
        method: 'get',
    }).then(resp => resp.json())
    if (code !== 0) {
        // token 获取失败
        throw new Error(msg)
    }
    return token
}

/**
 * 上传文件到七牛云
 * @param file 文件对象
 * @param path 文件保存路径
 * @param token 上传token
 */
export function uploadFile(file: File, path: string, token: string) {
    return new Promise((resolve, reject) => {
        const observable = qiniuJS.upload(file, path, token, {
            mimeType: mime.getType(path)!,
        })
        observable.subscribe({
            error(err) {
                reject(err);
            },
            complete(res) {
                resolve(res)
            },
        });
    })
}
