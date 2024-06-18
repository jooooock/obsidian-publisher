type TreeItemKind = 'file' | 'directory'

// 文件上传状态
type UploadState = '' | 'uploading' | 'synced' | 'failed'


interface TreeItemCommon {
    kind: TreeItemKind
    id: number
    pid: number[]
    name: string
    level: number
    checked: boolean
}
interface TreeItemFile extends TreeItemCommon{
    kind: 'file'
    file: File
    path: string[]
    uploadState: UploadState
}
interface TreeItemDirectory extends TreeItemCommon{
    kind: 'directory'
    collapsed: boolean
    children: TreeItem[]
    fileCount: number
}

export type TreeItem = TreeItemFile | TreeItemDirectory


// 排序选项
export type SortMethod = 'A-Z' | 'Z-A' | '1-9' | '9-1'

interface UploadFileItem {
    path: string[]
    hash: string
}
export interface UploadFileData {
    files: UploadFileItem[]
    lastUploadAt: number
}
