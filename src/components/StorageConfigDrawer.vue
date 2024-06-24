<template>
  <a-tooltip :mouse-enter-delay=".3">
    <template #title>存储配置</template>
    <button type="button" @click="openDrawer" class="btn btn-sm hover-gray">
      <CloudCog/>
    </button>
  </a-tooltip>

  <a-drawer
      v-model:open="drawerVisibility"
      title="存储配置"
      placement="right"
      size="large"
      :closable="false"
  >
    <p class="text-success">以下配置不会上传到服务器，也不会在网络中传输，仅留存在本地(<code>.obsidian/publisher/</code>目录下)，请放心配置。</p>

    <a-form :model="form" :rules="rules" layout="vertical" ref="formRef">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="存储服务商(provider)" name="provider">
            <a-select v-model:value="form.provider" placeholder="选择存储服务商(provider)" @change="onProviderChange">
              <a-select-option value="qiniu">七牛云</a-select-option>
              <a-select-option value="r2">Cloudflare R2</a-select-option>
              <a-select-option value="custom">自定义</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Bucket Name" name="bucketName">
            <a-input v-model:value="form.bucketName" placeholder="输入 Bucket Name" autocomplete="off"/>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16" v-if="form.provider">
        <a-col :span="12" v-if="form.provider === 'qiniu'">
          <a-form-item label="存储区域(region)" name="region">
            <a-select v-model:value="form.region" placeholder="选择存储区域(region)" @change="onQiniuRegionChange">
              <a-select-option value="cn-east-1">华东-浙江</a-select-option>
              <a-select-option value="cn-east-2">华东-浙江2</a-select-option>
              <a-select-option value="cn-north-1">华北-河北</a-select-option>
              <a-select-option value="cn-south-1">华南-广东</a-select-option>
              <a-select-option value="us-north-1">北美-洛杉矶</a-select-option>
              <a-select-option value="ap-southeast-1">亚太-新加坡（原东南亚）</a-select-option>
              <a-select-option value="ap-southeast-2">亚太-河内</a-select-option>
              <a-select-option value="ap-southeast-3">亚太-胡志明</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12" v-else>
          <a-form-item label="Region" name="region">
            <a-input v-model:value="form.region" placeholder="Region" autocomplete="off"/>
          </a-form-item>
        </a-col>
        <a-col :span="12" v-if="form.provider === 'r2'">
          <a-form-item label="Account ID" name="accountID">
            <a-input v-model:value="form.accountID" placeholder="输入 Account ID" autocomplete="off" @change="onR2AccountIDChange"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Endpoint" name="endpoint">
            <a-input v-model:value="form.endpoint" placeholder="Endpoint" autocomplete="off" :disabled="form.provider === 'qiniu' || form.provider === 'r2'"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Access Key" name="accessKeyID">
            <a-input v-model:value="form.accessKeyID" placeholder="输入 Access Key" autocomplete="off"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Secret Key" name="secretAccessKey">
            <a-input v-model:value="form.secretAccessKey" placeholder="输入 Secret Key" autocomplete="off"/>
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

<script setup lang="ts">
import {computed, reactive, ref} from "vue";
import {message} from 'ant-design-vue'
import {CloudCog} from 'lucide-vue-next'
import type {Rule} from "ant-design-vue/es/form"
import type {S3StorageOptions} from '@/types'
import {readDiskFileContent, writeDiskFileContent} from "@/stores/fs"
import {initCloudStorage} from '@/stores/storage-config'


const formRef = ref(null)
const form: S3StorageOptions = reactive({
  provider: 'custom',
  region: '',
  endpoint: '',
  accountID: '',
  accessKeyID: '',
  secretAccessKey: '',
  bucketName: '',
})

const rules = computed(() => {
  const _rules: Record<string, Rule[]> = {
    provider: [
      {required: true, message: '请选择存储方案', trigger: 'blur'},
    ],
    bucketName: [
      {required: true, message: '请填写 Bucket Name', trigger: 'blur'},
    ],
    accessKeyID: [
      {required: true, message: '请填写 Access Key ID', trigger: 'blur'},
    ],
    secretAccessKey: [
      {required: true, message: '请填写 Secret Access Key', trigger: 'blur'},
    ],
  }

  if (form.provider === 'qiniu') {
    _rules['region'] = [
      {required: true, message: '请选择 region', trigger: 'blur'},
    ]
  } else if (form.provider === 'r2') {
    _rules['accountID'] = [
      {required: true, message: '请填写 Account ID', trigger: 'blur'},
    ]
  } else {
    _rules['region'] = [
      {required: true, message: '请填写 region', trigger: 'blur'},
    ]
    _rules['endpoint'] = [
      {required: true, message: '请填写 endpoint', trigger: 'blur'},
    ]
  }

  return _rules
})

function onProviderChange(provider: S3StorageOptions['provider']) {
  if (provider === 'r2') {
    form.region = 'auto'
  } else {
    form.region = ''
    form.accountID = ''
  }
  form.endpoint = ''
}
function onQiniuRegionChange(region: string) {
  form.endpoint = `https://s3.${region}.qiniucs.com`
}
function onR2AccountIDChange(evt: InputEvent) {
  const accountID = (evt.target as HTMLInputElement).value
  form.endpoint = `https://${accountID}.r2.cloudflarestorage.com`
}


const drawerVisibility = ref(false)

async function openDrawer() {
  drawerVisibility.value = true

  // 每次打开弹框时，都从文件系统读取最新的配置并填入表单
  const options = await readDiskFileContent('.obsidian/publisher/s3.json')
  if (options) {
    Object.assign(form, JSON.parse(options))
  }
}

const btnLoading = ref(false)

async function save() {
  (formRef.value! as any).validate().then(async () => {
    btnLoading.value = true

    try {
      await writeDiskFileContent('.obsidian/publisher/s3.json', JSON.stringify(form, null, 2))
      drawerVisibility.value = false
      message.success('保存成功')

      initCloudStorage(form)
    } catch (e: any) {
      message.error(e.message)
    } finally {
      btnLoading.value = false
    }
  }).catch((e: any) => {
    // 表单验证失败
  })
}
</script>

<style scoped>
.hover-gray:hover {
  background: lightgray;
}
</style>
