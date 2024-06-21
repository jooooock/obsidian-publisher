<template>
  <Actions />
  <div class="tree-list-wrapper" v-if="treeNodes.length">
    <Tree
        :tree-data="treeNodes"
        :hide-empty-dir="hideEmptyDir"
        :show-file-size="showFileSize"
        :disabled="isPublishing"
        :sort="sort"
        @toggle:collapse="onToggleEntry"
        @check:change="onEntryCheckChange"
    />
  </div>
  <Status />
  <Progress />

  <figure class="figure d-flex flex-column align-items-center" v-if="!vaultName">
    <img src="@/assets/images/not-select-vault.png" class="figure-img img-fluid" alt="...">
    <button class="btn btn-primary btn-sm" @click="selectDirectory">请选择仓库目录</button>
  </figure>
</template>

<script setup lang="ts">
import Progress from "@/components/Progress.vue"
import Actions from "@/components/Actions.vue"
import Tree from "@/components/Tree.vue"
import Status from "@/components/Status.vue"
import type {TreeItem, TreeItemDirectory} from "@/types"
import {treeNodes, isPublishing, hideEmptyDir, showFileSize, sort, vaultName, selectDirectory} from "@/stores/app"


function onToggleEntry(directory: TreeItemDirectory) {
  directory.collapsed = !directory.collapsed
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
</script>

<style scoped>
@import "@/styles/utils.css";

.tree-list-wrapper {
  /* 100vh - Actions高度 - Status高度 - Progress高度 */
  height: calc(100vh - 46px - 40px - 60px);
  border: 1px solid lightgray;
  border-radius: 5px;
  overflow-x: hidden;
  overflow-y: scroll;
  font-family: Monaco, sans-serif;
}
</style>
