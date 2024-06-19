type TreeItemKind = 'file' | 'directory'

// 文件上传状态
type UploadState = '' | 'uploading' | 'synced' | 'failed' | 'dirty'


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

// 发布缓存项
interface PublishFileItem {
    path: string[]
    hash: string
}
export interface PublishCache {
    files: PublishFileItem[]
    lastPublishAt: number
}

export interface SiteOptions {
    // 网站名称
    siteName: string

    // 网站首页加载的文件
    indexFile: string

    // 网站logo
    logo: string

    // 默认主题
    defaultTheme: "light" | "dark" | "system"

    // 是否显示主题切换组件
    showThemeToggle: boolean

    // 是否显示 Hover 预览
    showHoverPreview: boolean

    // Limit maximum line length.
    // Fits less content on the screen, but makes long paragraphs more readable.
    readableLineLength: boolean

    // Markdown specs ignore single line breaks in reading view.
    // Turn this off to make single line breaks visible.
    strictLineBreaks: boolean

    // 是否隐藏页面内标题
    hideTitle: boolean

    // 是否在左侧显示所有发布的文章
    showNavigation: boolean

    // 是否显示搜索组件
    showSearch: boolean

    // 是否显示文章目录/大纲
    showOutline: boolean

    // 是否显示反链
    showBacklinks: boolean

    // 是否显示关系图谱
    showGraph: boolean

    // 滑动窗口模式
    slidingWindowMode: boolean
}
