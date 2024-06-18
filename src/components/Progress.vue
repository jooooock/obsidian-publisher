<script setup lang="ts">
import {
  checkedFilesCount,
  isPublishing,
  syncedFilesCount,
  totalFileSize,
  uploadedFilesSize,
  uploadingFileEntry,
  uploadPercent
} from "@/stores/app";
import {readableFileSize} from "@/utils";
</script>

<template>
  <div class="progress-wrapper">
    <a-progress v-if="isPublishing" :percent="uploadPercent" status="active"/>
    <p class="path d-flex" v-if="uploadingFileEntry">
      当前正在上传:
      <span class="mx-2">({{ syncedFilesCount }} / {{ checkedFilesCount }})</span>
      <span class="text-info me-2 uploading-filename">{{ uploadingFileEntry.path.join('/') }}</span>
      <span>({{ readableFileSize(uploadingFileEntry.file.size) }})</span>
      <span class="flex-grow-1"></span>
      <span>{{ uploadedFilesSize }} / {{ totalFileSize }}</span>
    </p>
  </div>
</template>

<style scoped>
.progress-wrapper {
  height: 60px;
  font-size: 14px;
  color: #9ea2a6;
}

.uploading-filename {
  text-overflow: ellipsis;
  text-wrap: nowrap;
  overflow: hidden;
  max-width: 500px;
}
</style>
