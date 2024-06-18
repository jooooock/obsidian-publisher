<script setup lang="ts">
import {isPublishing, selectDirectory, vaultName} from "@/stores/app"
</script>

<template>
  <header id="header" class="d-flex justify-content-between align-items-center mb-2">
    <h2 class="m-0">Obsidian Publish Manager</h2>
    <button class="btn btn-primary btn-sm" @click="selectDirectory" :disabled="isPublishing">
      <span v-if="vaultName">当前选择: {{ vaultName }}</span>
      <span v-else>选择仓库目录</span>
    </button>
  </header>
</template>

<style scoped>
#header {
  height: 50px;
  border-bottom: 1px solid lightgray;

  & h2 {
    font-weight: bold;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  }
}
</style>
