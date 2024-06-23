<template>
  <div class="actions d-flex pb-2" v-if="treeNodes.length">
    <div class="d-flex align-items-center">
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

      <!-- 存储配置-->
      <StorageConfigDrawer />

      <!-- 网站配置-->
      <SiteConfigDrawer />
    </div>


    <div class="flex-grow-1"></div>

    <div class="d-flex align-items-center">
      <button class="btn btn-light mx-2" @click="selectDirectory" :disabled="isPublishing">
        <span v-if="vaultName">当前选择仓库: {{ vaultName }}</span>
        <span v-else>选择仓库目录</span>
      </button>

      <button class="btn btn-primary d-flex align-items-center" @click="publish"
              :disabled="checkedFilesCount <= 0 || isPublishing">
        <Loader v-if="isPublishing" class="spin me-1" :size="18"/>
        {{ isPublishing ? `发布中(${s3Provider})` : `开始发布(${s3Provider})` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, watch} from "vue";
import {ArrowUpNarrowWide, ChevronsDownUp, ChevronsUpDown, Loader} from "lucide-vue-next"
import SortOptions from "@/components/SortOptions.vue"
import SiteConfigDrawer from "@/components/SiteConfigDrawer.vue"
import StorageConfigDrawer from "@/components/StorageConfigDrawer.vue"
import {
  checkedFilesCount,
  hideEmptyDir,
  isPublishing,
  selectDirectory,
  showFileSize,
  sort,
  treeNodes,
  publish,
  vaultName
} from "@/stores/app";
import type {SortMethod, TreeItem} from "@/types";
import {resolveAllFiles} from "@/utils";
import {s3Provider} from "@/stores/storage-config"


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

<style scoped>
@import "@/styles/utils.css";

.hover-gray:hover {
  background: lightgray;
}
@media (max-width: 992px) {
  .actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
