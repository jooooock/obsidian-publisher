<template>
  <FolderClosed :size="size" v-if="item.kind === 'directory' && item.collapsed"/>
  <FolderOpen :size="size" v-else-if="item.kind === 'directory' && !item.collapsed"/>
  <File :size="size" v-else/>
</template>

<script setup lang="ts">
import {File, FolderClosed, FolderOpen} from "lucide-vue-next";
import type {TreeItem} from "@/types";

interface Props {
  item: TreeItem
  size: number
}

withDefaults(defineProps<Props>(), {
  size: 24,
})
</script>
