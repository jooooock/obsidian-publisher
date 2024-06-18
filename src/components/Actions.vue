<script setup lang="ts">
import {ref, watch} from "vue";
import {ArrowUpNarrowWide, ChevronsDownUp, ChevronsUpDown, Loader} from "lucide-vue-next"
import SortOptions from "@/components/SortOptions.vue"
import {
  checkedFilesCount,
  hideEmptyDir,
  isPublishing,
  showFileSize,
  sort,
  totalFilesCount,
  totalFileSize,
  treeNodes,
  upload
} from "@/stores/app";
import type {SortMethod, TreeItem} from "@/types";
import {resolveAllFiles} from "@/utils";


const sortVisible = ref(false)

function onSortChange(value: SortMethod) {
  sort.value = value
  sortVisible.value = false
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
</script>

<template>
  <div class="actions d-flex align-items-center pb-2" v-if="treeNodes.length">
    <a-checkbox
        v-model:checked="checkAll"
        :indeterminate="checkAllIsIndeterminate"
        :disabled="isPublishing"
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
          <SortOptions :sort="sort" @change="onSortChange"/>
        </template>
        <button type="button" class="btn btn-sm hover-gray">
          <ArrowUpNarrowWide/>
        </button>
      </a-popover>
    </a-tooltip>

    <span class="mx-2 a-text-info">(已选: {{ checkedFilesCount }} / {{ totalFilesCount }}，共 {{ totalFileSize }})</span>

    <div class="flex-grow-1"></div>

    <button class="btn btn-primary d-flex align-items-center" @click="upload"
            :disabled="checkedFilesCount <= 0 || isPublishing">
      <Loader v-if="isPublishing" class="spin me-1" :size="18"/>
      {{ isPublishing ? '上传中' : '开始上传' }}
    </button>
  </div>
</template>

<style scoped>
.hover-gray:hover {
  background: lightgray;
}

.a-text-info {
  font-size: 14px;
  color: #9ea2a6;
}
</style>
