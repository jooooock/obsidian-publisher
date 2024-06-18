<template>
  <header id="header" class="d-flex justify-content-between align-items-center mb-2">
    <h2 class="m-0">Obsidian Publish Manager</h2>
    <button class="btn btn-primary btn-sm" @click="selectDirectory" :disabled="btnLoading">
      <span v-if="vaultName">当前选择: {{ vaultName }}</span>
      <span v-else>选择仓库目录</span>
    </button>
  </header>

  <!-- 进度条-->
  <div class="progress-wrapper">
    <a-progress v-if="btnLoading" :percent="uploadPercent" status="active" />
    <p class="path d-flex" v-if="uploadingFileEntry">
      当前正在上传:
      <span class="mx-2">({{ syncedFilesCount }} / {{ checkedFilesCount }})</span>
      <span class="text-info me-2 uploading-filename">{{ uploadingFileEntry.path.join('/') }}</span>
      <span>({{readableFileSize(uploadingFileEntry.file.size)}})</span>
      <span class="flex-grow-1"></span>
      <span>{{uploadedFilesSize}} / {{totalFileSize}}</span>
    </p>
  </div>

  <!-- 操作按钮-->
  <div class="actions d-flex align-items-center pb-2" v-if="treeNodes.length">
    <a-checkbox
        v-model:checked="checkAll"
        :indeterminate="checkAllIsIndeterminate"
        :disabled="btnLoading"
        @change="handleCheckAllChange"
        style="margin-inline: 10px"
    >
      全选
    </a-checkbox>
    <a-checkbox v-model:checked="showFileSize" style="margin-right: 10px">显示文件大小</a-checkbox>
    <a-checkbox v-model:checked="hideEmptyDir" style="margin-right: 10px">隐藏空目录</a-checkbox>

    <a-tooltip :mouseEnterDelay=".3">
      <template #title>全部折叠</template>
      <button type="button" @click="setAllCollapse(true)" class="btn btn-sm hover-gray">
        <ChevronsDownUp/>
      </button>
    </a-tooltip>
    <a-tooltip :mouseEnterDelay=".3">
      <template #title>全部展开</template>
      <button type="button" @click="setAllCollapse(false)" class="btn btn-sm hover-gray">
        <ChevronsUpDown/>
      </button>
    </a-tooltip>
    <a-tooltip :mouse-enter-delay=".3">
      <template #title>排序</template>
      <a-popover v-model:open="sortVisible" trigger="click" placement="rightTop">
        <template #content>
          <Sort :sort="sort" @change="onSortChange" />
        </template>
        <button type="button" class="btn btn-sm hover-gray">
          <ArrowUpNarrowWide />
        </button>
      </a-popover>
    </a-tooltip>

    <span class="mx-2 a-text-info">(已选: {{ checkedFilesCount }} / {{ totalFilesCount }}，共 {{totalFileSize}})</span>

    <div class="flex-grow-1"></div>

    <button class="btn btn-primary d-flex align-items-center" @click="upload"
            :disabled="checkedFilesCount <= 0 || btnLoading">
      <Loader v-if="btnLoading" class="spin me-1" :size="18"/>
      {{ btnLoading ? '上传中' : '开始上传' }}
    </button>
  </div>

  <!-- 目录树-->
  <div class="tree-list-wrapper" v-if="treeNodes.length">
    <Tree
        :tree-data="treeNodes"
        :hide-empty-dir="hideEmptyDir"
        :show-file-size="showFileSize"
        :disabled="btnLoading"
        :sort="sort"
        @toggle:collapse="onToggleEntry"
        @check:change="onEntryCheckChange"
    />
  </div>
</template>

<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue'
import Tree from "@/components/Tree.vue"
import Sort from "@/components/Sort.vue"
import {ChevronsDownUp, ChevronsUpDown, Loader, ArrowUpNarrowWide} from "lucide-vue-next"
import { message } from 'ant-design-vue'
import {readableFileSize, resolveAllFiles, uploadFile} from '@/utils'
import {SortMethod, TreeItem, TreeItemDirectory, TreeItemFile, UploadFileData} from "@/types";


let rootDirectoryEntry: FileSystemDirectoryHandle | null = null
let publishUploadFileEntry: FileSystemFileHandle | null = null


let treeNodes = reactive<TreeItem[]>([])
let vaultName = ref('')

let hideEmptyDir = ref(false)
let showFileSize = ref(false)
let sort = ref<SortMethod>('A-Z')
let sortVisible = ref(false)

function onSortChange(value: SortMethod) {
  sort.value = value
  sortVisible.value = false
}


// 仓库中的总文件数
let totalFilesCount = computed(() => {
  return resolveAllFiles(treeNodes).length
})
// 选中文件数
let checkedFilesCount = computed(() => {
  return resolveAllFiles(treeNodes).filter(entry => entry.checked).length
})
// 已上传文件数
let syncedFilesCount = computed(() => {
  return resolveAllFiles(treeNodes).filter(entry => entry.uploadState === 'synced').length
})
// 正在上传的文件
let uploadingFileEntry = computed(() => {
  return resolveAllFiles(treeNodes).find(entry => entry.uploadState === 'uploading')
})
// 已上传文件占选中文件的百分比
let uploadPercent = computed(() => Math.floor(syncedFilesCount.value / checkedFilesCount.value * 100 ))

// 已选中文件的总大小
let totalFileSize = computed(() => {
  return readableFileSize(resolveAllFiles(treeNodes).filter(entry => entry.checked).reduce((total, item) => total + item.file.size, 0))
})
// 已上传文件的总大小
let uploadedFilesSize = computed(() => {
  return readableFileSize(resolveAllFiles(treeNodes).filter(entry => entry.uploadState === 'synced').reduce((total, item) => total + item.file.size, 0))
})

let _uploadFileData: UploadFileData | null = null

// 选择仓库目录
async function selectDirectory() {
  try {
    rootDirectoryEntry = await window.showDirectoryPicker({mode: 'readwrite'})
  } catch (e) {
    console.warn(e)
    return
  }

  // 检查选择的目录是否是仓库目录(根目录有一个 .obsidian 目录)
  try {
    const obsidianDirectoryHandle = await rootDirectoryEntry.getDirectoryHandle('.obsidian')
    publishUploadFileEntry = await obsidianDirectoryHandle.getFileHandle('.publish_upload.json', {create: true})

    _uploadFileData = await readUploadData()
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      alert('选择的目录不是一个合法的仓库目录(仓库目录通常会包含一个 .obsidian 隐藏目录)')
    } else {
      console.error(e)
    }
    return
  }

  vaultName.value = rootDirectoryEntry.name

  let nodes = await convertEntryToTreeNodes(rootDirectoryEntry)
  resolveFileCountInTreeNode(nodes)

  treeNodes.length = 0
  treeNodes.push(...nodes)
}

async function saveUploadData(contents: string) {
  const writable = await publishUploadFileEntry!.createWritable();
  await writable.write(contents);
  await writable.close();
}

async function readUploadData(): Promise<UploadFileData> {
  return new Promise(async (resolve, reject) => {
    if (publishUploadFileEntry) {
      const file = await publishUploadFileEntry.getFile()
      const fileReader = new FileReader()
      fileReader.addEventListener('load', event => {
        try {
          const result = event.target!.result as string
          resolve(JSON.parse(result || "{\"files\":[]}"))
        } catch (e) {
          reject(e)
        }
      })
      fileReader.readAsText(file, 'utf-8')
    } else {
      reject(new Error('file handle is empty'))
    }
  })
}

let _id = 0

/**
 * 递归解析目录下面的所有文件，组成树状结构返回
 */
async function convertEntryToTreeNodes(directoryEntry: FileSystemDirectoryHandle, level = 0, path: number[] = []) {
  const nodes: TreeItem[] = []

  for await (const entry of directoryEntry.values()) {
    // 忽略顶层目录下面的隐藏文件/目录
    if (level === 0 && entry.name.startsWith('.')) {
      continue
    }
    let id = _id++

    if (entry.kind === 'file') {
      const filePath = await rootDirectoryEntry!.resolve(entry)
      const hasUploaded = _uploadFileData!.files.some(file => file.path.join('/') === filePath!.join('/'))

      nodes.push({
        pid: path.concat(id),
        id: id,
        kind: 'file',
        name: entry.name,
        level: level,
        checked: false,
        file: await entry.getFile(),
        path: filePath!,
        uploadState: hasUploaded ? "synced" : '',
      })
    } else if (entry.kind === 'directory') {
      nodes.push({
        pid: path.concat(id),
        id: id,
        kind: 'directory',
        name: entry.name,
        level: level,
        collapsed: true,
        checked: false,
        children: await convertEntryToTreeNodes(entry, level + 1, path.concat(id)),
        fileCount: 0,
      })
    }
  }

  return nodes
}

/**
 * 计算目录包含的文件数
 */
function resolveFileCountInTreeNode(treeNodes: TreeItem[]) {
  travelTreeDirectoryNodes(treeNodes, (node) => {
    node.fileCount = resolveAllFiles(node.children).length
  })
}

function travelTreeDirectoryNodes(treeNodes: TreeItem[], fn: (node: TreeItemDirectory) => void) {
  treeNodes.forEach(node => {
    if (node.kind === 'directory') {
      fn(node)

      travelTreeDirectoryNodes(node.children, fn)
    }
  })
  return treeNodes
}

function onToggleEntry(item: TreeItemDirectory) {
  item.collapsed = !item.collapsed
}

function setAllCollapse(collapse: boolean) {
  function setDirectoryCollapse(children: TreeItem[], collapse: boolean) {
    children.forEach(entry => {
      if (entry.kind === 'directory') {
        entry.collapsed = collapse
        setDirectoryCollapse(entry.children, collapse)
      }
    })
  }

  setDirectoryCollapse(treeNodes, collapse)
}

function onEntryCheckChange(item: TreeItem, checked: boolean) {
  function setChecked(children: TreeItem[], checked: boolean) {
    children.forEach(entry => {
      entry.checked = checked
      if (entry.kind === 'directory') {
        setChecked(entry.children, checked)
      }
    })
  }

  if (item.kind === 'directory') {
    // 递归修改后代节点 (后代子节点全部选中/取消选中)
    setChecked(item.children, checked)
  }
}

function updateAllDirectoryCheckState() {
  function updateDirectoryCheckState(children: TreeItem[]) {
    children.forEach(node => {
      if (node.kind === 'directory') {
        const allFiles = resolveAllFiles(node.children)
        node.checked = allFiles.every(node => node.checked)

        updateDirectoryCheckState(node.children)
      }
    })
  }

  updateDirectoryCheckState(treeNodes)
}

const checkAll = ref(false)
const checkAllIsIndeterminate = ref(false)

watch(() => treeNodes, () => {
  const allFileEntries = resolveAllFiles(treeNodes)
  if (allFileEntries.every(entry => entry.checked)) {
    checkAll.value = true
    checkAllIsIndeterminate.value = false
  } else if (allFileEntries.every(entry => !entry.checked)) {
    checkAll.value = false
    checkAllIsIndeterminate.value = false
  } else {
    checkAll.value = false
    checkAllIsIndeterminate.value = true
  }

  updateAllDirectoryCheckState()
}, {
  deep: true,
})


const handleCheckAllChange = (event: InputEvent) => {
  setAllChecked((event.target as HTMLInputElement).checked)
}

function setAllChecked(checked: boolean) {
  function setDirectoryChecked(children: TreeItem[], checked: boolean) {
    children.forEach(entry => {
      entry.checked = checked
      if (entry.kind === 'directory') {
        setDirectoryChecked(entry.children, checked)
      }
    })
  }

  setDirectoryChecked(treeNodes, checked)
}

// 上传文件
const btnLoading = ref(false)

async function upload() {
  const checkedFiles = resolveAllFiles(treeNodes).filter(entry => entry.checked)
  btnLoading.value = true

  const uploadData: UploadFileData = {
    files: [],
    lastUploadAt: 0,
  }

  for (const entry of checkedFiles) {
    if (entry.uploadState === 'synced') {
      uploadData.files.push({
        path: entry.path,
        hash: '',
      })
      continue
    }

    entry.uploadState = 'uploading'

    try {
      const {code, msg} = await uploadFile(entry)
      if (code === 0) {
        entry.uploadState = 'synced'
        uploadData.files.push({
          path: entry.path,
          hash: '',
        })
      } else {
        console.warn(msg)
        entry.uploadState = 'failed'
      }
    } catch (e) {
      // 上传出错
      console.error(e)
      entry.uploadState = 'failed'
    }
  }

  // 已上传文件数据写入磁盘
  uploadData.lastUploadAt = Date.now()
  await saveUploadData(JSON.stringify(uploadData, null, 2))

  btnLoading.value = false
  message.success('上传完毕')
}
</script>

<style scoped>
@import "@/styles/utils.css";

#header {
  height: 50px;
  border-bottom: 1px solid lightgray;

  & h2 {
    font-weight: bold;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
}

.uploading-filename {
  text-overflow: ellipsis;
  text-wrap: nowrap;
  overflow: hidden;
  max-width: 500px;
}

.hover-gray:hover {
  background: lightgray;
}

.tree-list-wrapper {
  height: calc(100vh - (50px + 0.5rem) - 60px - 46px);
  border: 1px solid lightgray;
  border-radius: 5px;
  overflow-x: hidden;
  overflow-y: scroll;
  font-family: Monaco, sans-serif;
}

.progress-wrapper {
  height: 60px;
  font-size: 14px;
  color: #9ea2a6;
}
.a-text-info {
  font-size: 14px;
  color: #9ea2a6;
}
</style>
