<script setup lang="ts">
import {checkedFilesCount, totalFilesCount, totalFileSize, treeNodes} from "@/stores/app";
import {publishCache} from "@/stores/publish-cache";
import * as dayjs from "dayjs";

function formatLastPublishTime(timestamp: number) {
  return dayjs.default(timestamp).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<template>
  <div class="py-2" v-if="treeNodes.length">
      <span class="mx-2 a-text-info">已选: {{ checkedFilesCount }} / {{ totalFilesCount }}，共 {{
          totalFileSize
        }}</span>
    <span class="a-text-info ms-3">上次发布时间: {{ formatLastPublishTime(publishCache.lastPublishAt) }}</span>
  </div>
</template>

<style scoped>
.a-text-info {
  font-size: 14px;
  color: #9ea2a6;
}
</style>
