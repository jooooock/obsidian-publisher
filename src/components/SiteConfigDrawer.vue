<script setup lang="ts">
import {reactive, ref} from "vue";
import {message, notification} from 'ant-design-vue'
import {Cog} from 'lucide-vue-next'
import type {SiteOptions} from '@/types'
import {readDiskFileContent, writeDiskFileContent} from "@/stores/fs";
import {cloudStorage} from "@/stores/storage-config"


const form: SiteOptions = reactive({
  siteName: '',
  indexFile: '',
  logo: '',
  defaultTheme: 'system',
  showThemeToggle: true,
  showHoverPreview: true,
  readableLineLength: false,
  strictLineBreaks: true,
  hideTitle: false,
  showNavigation: true,
  showSearch: true,
  showOutline: true,
  showBacklinks: true,
  showGraph: true,
  slidingWindowMode: false,
})

const drawerVisibility = ref(false)

async function openDrawer() {
  drawerVisibility.value = true

  const options = await readDiskFileContent('.obsidian/publisher/options.json')
  if (options) {
    Object.assign(form, JSON.parse(options))
  }
}

const btnLoading = ref(false)

async function save() {
  if (!cloudStorage) {
    notification.warning({
      message: '请先进行存储配置',
    });
    return
  }

  btnLoading.value = true

  try {
    // 上传网站配置
    await cloudStorage.putObject(JSON.stringify(form, null, 2), 'options.json')

    // 同步到磁盘
    await writeDiskFileContent('.obsidian/publisher/options.json', JSON.stringify(form, null, 2))

    drawerVisibility.value = false
    message.success('保存成功')
  } catch (e: any) {
    message.error(e.message)
  } finally {
    btnLoading.value = false
  }
}
</script>

<template>
  <a-tooltip :mouse-enter-delay=".3">
    <template #title>网站配置</template>
    <button type="button" @click="openDrawer" class="btn btn-sm hover-gray">
      <Cog/>
    </button>
  </a-tooltip>

  <a-drawer
      v-model:open="drawerVisibility"
      title="网站配置"
      placement="right"
      size="large"
      :closable="false"
  >
    <a-form :model="form" layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="网站名称" name="siteName">
            <a-input v-model:value="form.siteName" placeholder="输入网站名称" autocomplete="off"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="首页文件" name="indexFile">
            <a-input v-model:value="form.indexFile" placeholder="输入首页文件" autocomplete="off"/>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Logo" name="logo">
            <a-input v-model:value="form.logo" placeholder="输入logo" autocomplete="off"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="默认主题" name="defaultTheme">
            <a-select v-model:value="form.defaultTheme" placeholder="选择默认主题">
              <a-select-option value="light">light</a-select-option>
              <a-select-option value="dark">dark</a-select-option>
              <a-select-option value="system">system</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="显示主题切换组件" name="showThemeToggle">
            <a-switch v-model:checked="form.showThemeToggle"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="显示Hover预览" name="showHoverPreview">
            <a-switch v-model:checked="form.showHoverPreview"/>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="readableLineLength" name="readableLineLength">
            <a-switch v-model:checked="form.readableLineLength"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="strictLineBreaks" name="strictLineBreaks">
            <a-switch v-model:checked="form.strictLineBreaks"/>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="hideTitle" name="hideTitle">
            <a-switch v-model:checked="form.hideTitle"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="showNavigation" name="showNavigation">
            <a-switch v-model:checked="form.showNavigation"/>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="showSearch" name="showSearch">
            <a-switch v-model:checked="form.showSearch"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="showOutline" name="showOutline">
            <a-switch v-model:checked="form.showOutline"/>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="showBacklinks" name="showBacklinks">
            <a-switch v-model:checked="form.showBacklinks"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="showGraph" name="showGraph">
            <a-switch v-model:checked="form.showGraph"/>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="24">
          <a-form-item label="slidingWindowMode" name="slidingWindowMode">
            <a-switch v-model:checked="form.slidingWindowMode"/>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
    <template #extra>
      <a-space>
        <a-button type="primary" @click="save" :loading="btnLoading" :disabled="btnLoading">保存</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<style scoped>
.hover-gray:hover {
  background: lightgray;
}
</style>
