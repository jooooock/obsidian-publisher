<template>
  <div v-for="item in renderedTreeNodes" :key="item.id">
    <!-- 节点的渲染-->
    <div class="d-flex align-items-center tree-node" @click="onEntryClick(item)" :class="{checked: item.checked}">
      <!-- 文件选择框-->
      <div style="margin-inline: 10px" @click.stop>
        <a-checkbox
            v-model:checked="item.checked"
            :indeterminate="isIndeterminate(item)"
            :disabled="disabled"
            @change="onEntryCheckChange(item, $event)"
        />
      </div>

      <!-- 目录层级缩进-->
      <div class="tree-indent d-flex align-self-stretch" v-if="item.level > 0">
        <div class="tree-indent-unit" v-for="n of item.level" :key="n"></div>
      </div>

      <!-- 目录展开/收起指示器-->
      <div class="switcher d-flex justify-content-center">
        <ChevronRight
            v-if="item.kind === 'directory'"
            :size="16"
            class="switcher-icon"
            :class="item.collapsed ? 'collapsed' : 'expand'"
        />
      </div>

      <!-- 文件图标-->
      <div style="margin-inline: 8px">
        <FolderClosed :size="16" v-if="item.kind === 'directory' && item.collapsed"/>
        <FolderOpen :size="16" v-else-if="item.kind === 'directory' && !item.collapsed"/>
        <File :size="16" v-else/>
      </div>

      <div class="d-flex flex-grow-1 align-items-center tree-node-title px-2">
        <!-- 目录/文件名-->
        <span class="me-2" :class="{'fw-bold': item.kind === 'directory'}">{{ item.name }}</span>

        <!-- 目录显示文件数量-->
        <span v-if="item.kind === 'directory'" class="count-info text-info">({{ item.fileCount }})</span>

        <div class="flex-grow-1"></div>

        <!-- 同步状态-->
        <a-tooltip :mouseEnterDelay=".5">
          <template #title>已发布</template>
          <CircleCheckBig v-if="itemHasSynced(item)" :size="18" class="icon-status-success ms-2"/>
        </a-tooltip>
        <a-tooltip :mouseEnterDelay=".5">
          <template #title>发布失败</template>
          <TriangleAlert v-if="itemHasFailed(item)" :size="18" class="icon-status-failed ms-2"/>
        </a-tooltip>
        <a-tooltip :mouseEnterDelay=".5">
          <template #title>发布中</template>
          <Loader v-if="itemIsUploading(item)" :size="18" color="dimgray" class="spin ms-2"/>
        </a-tooltip>
        <a-tooltip :mouseEnterDelay=".5">
          <template #title>文件内容已修改</template>
          <Repeat2 v-if="itemHasDirty(item)" :size="18" class="icon-status-dirty ms-2"/>
        </a-tooltip>

        <!-- 文件大小-->
        <span v-if="showFileSize" class="size-info text-info">{{ readableFileSize(entryFileSize(item)) }}</span>
      </div>
    </div>

    <!-- 子节点的渲染-->
    <div v-if="item.kind === 'directory' && item.children.length > 0 && !item.collapsed" class="item-children">
      <tree
          :treeData="item.children"
          :hide-empty-dir="hideEmptyDir"
          :show-file-size="showFileSize"
          :disabled="disabled"
          :sort="sort"
          @toggle:collapse="onEntryClick"
          @check:change="onCheckChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed} from "vue";
import {
  ChevronRight,
  CircleCheckBig,
  File,
  FolderClosed,
  FolderOpen,
  Loader,
  Repeat2,
  TriangleAlert
} from "lucide-vue-next";
import {readableFileSize, resolveAllFiles} from '@/utils'
import {SortMethod, TreeItem} from "@/types";

interface Props {
  treeData: TreeItem[]
  hideEmptyDir: boolean
  showFileSize: boolean
  disabled: boolean
  sort: SortMethod
}

const props = withDefaults(defineProps<Props>(), {
  hideEmptyDir: false,
  showFileSize: false,
  disabled: false,
  sort: 'A-Z',
})

const emit = defineEmits(['check:change', 'toggle:collapse'])

// 需要渲染的数据 (按需排除空目录)
const renderedTreeNodes = computed(() => {
  return props.treeData
      .filter(item => props.hideEmptyDir && item.kind === 'directory' ? item.fileCount > 0 : true)
      .sort((a: TreeItem, b: TreeItem) => {
        if (a.kind === 'directory' && b.kind === 'directory') {
          // 目录按照文件名 a-z
          return a.name > b.name ? 1 : -1
        } else if (a.kind === 'directory' && b.kind === 'file') {
          return -1
        } else if (a.kind === 'file' && b.kind === 'directory') {
          return 1
        } else if (a.kind === 'file' && b.kind === 'file') {
          if (props.sort === 'A-Z') {
            return a.name > b.name ? 1 : -1
          } else if (props.sort === 'Z-A') {
            return a.name > b.name ? -1 : 1
          } else if (props.sort === '1-9') {
            return a.file.size > b.file.size ? 1 : -1
          } else if (props.sort === '9-1') {
            return a.file.size > b.file.size ? -1 : 1
          } else {
            return 0
          }
        } else {
          return 0
        }
      })
})

function onEntryClick(item: TreeItem) {
  if (item.kind === 'directory') {
    emit('toggle:collapse', item)
  } else if (!props.disabled) {
    item.checked = !item.checked
  }
}

function onEntryCheckChange(item: TreeItem, event: InputEvent) {
  emit('check:change', item, (event.target as HTMLInputElement).checked)
}


let isIndeterminate = computed(() => {
  return (item: TreeItem) => {
    if (item.kind === 'file') {
      return false
    }

    const allFileEntries = resolveAllFiles(item.children)
    return !allFileEntries.every(entry => entry.checked) && !allFileEntries.every(entry => !entry.checked)
  }
})

function onCheckChange(item: TreeItem, checked: boolean) {
  emit('check:change', item, checked)
}

function entryFileSize(item: TreeItem) {
  if (item.kind === 'file') {
    return item.file.size
  } else {
    const fileEntries = resolveAllFiles(item.children)
    return fileEntries.reduce((total, item) => total + item.file.size, 0)
  }
}


function itemHasSynced(item: TreeItem) {
  if (item.kind === 'file' && item.uploadState === 'synced') {
    return true
  }
  if (item.kind === 'directory') {
    const allFileEntries = resolveAllFiles(item.children)
    return allFileEntries.length > 0 && allFileEntries.every(entry => entry.uploadState === 'synced')
  }
}

function itemIsUploading(item: TreeItem) {
  if (item.kind === 'file' && item.uploadState === 'uploading') {
    return true
  }
  if (item.kind === 'directory') {
    return resolveAllFiles(item.children).some(entry => entry.uploadState === 'uploading')
  }
}

function itemHasFailed(item: TreeItem) {
  if (item.kind === 'file' && item.uploadState === 'failed') {
    return true
  }
  if (item.kind === 'directory') {
    return resolveAllFiles(item.children).some(entry => entry.uploadState === 'failed')
  }
}

function itemHasDirty(item: TreeItem) {
  return item.kind === 'file' && item.uploadState === 'dirty';
}
</script>

<style scoped>
@import "@/styles/utils.css";

.tree-node {
  &:hover {
    background: #eaeaea;
    cursor: pointer;
  }

  & .tree-node-title {
    color: dimgray;
    font-size: 15px;
    padding-block: 5px;
  }

  &.checked {
    color: #0d6efd;

    & .tree-node-title {
      color: #0d6efd;
      font-weight: bold;
    }
  }
}

.tree-indent-unit {
  position: relative;
  width: 20px;
  height: 100%;

  &:before {
    content: "";
    display: block;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: gainsboro;
  }
}

.switcher {
  width: 20px;

  & .switcher-icon {
    transition: all .2s;
  }

  & .switcher-icon.collapsed {
    transform: rotate(0);
  }

  & .switcher-icon.expand {
    transform: rotate(90deg);
  }
}

.count-info,
.size-info {
  font-size: 14px;
}

.size-info {
  width: 100px;
  text-align: right;
}

.icon-status-success {
  color: #37e181;

  &:hover {
    color: #29aa63;
  }
}

.icon-status-failed {
  color: #db3a3a;

  &:hover {
    color: red;
  }
}

.icon-status-dirty {
  color: #0d6efd;
}
</style>
