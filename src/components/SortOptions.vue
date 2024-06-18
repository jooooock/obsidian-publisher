<template>
  <div
      v-for="item of options"
      :key="item.value"
      class="sort-item d-flex align-items-center"
      :class="{selected: sort === item.value}"
      @click="onChange(item)"
  >
    <Check class="icon" :size="14" v-if="sort === item.value" />
    <span>{{item.label}}</span>
  </div>
</template>

<script setup lang="ts">
import {Check} from "lucide-vue-next";
import type {SortMethod} from "@/types";

interface Props {
  sort: SortMethod
}
interface SortOption {
  label: string
  value: SortMethod
}

withDefaults(defineProps<Props>(), {
  sort: 'A-Z'
})

const options: SortOption[] = [
  {label: '文件名 (A-Z)', value: 'A-Z'},
  {label: '文件名 (Z-A)', value: 'Z-A'},
  {label: '文件大小 (从小到大)', value: '1-9'},
  {label: '文件大小 (从大到小)', value: '9-1'},
]

const emit = defineEmits<{
  change: [sort: SortMethod]
}>()

function onChange(item: SortOption) {
  emit('change', item.value)
}
</script>


<style scoped>
.sort-item {
  padding-inline: 25px;
  padding-block: 5px;
  position: relative;
  font-size: 14px;
  cursor: pointer;

  & .icon {
    position: absolute;
    left: 5px;
  }

  &:hover {
    background: #0d6efd;
    color: white;
  }
}
</style>
