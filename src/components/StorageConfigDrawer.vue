<script setup lang="ts">
import {computed, reactive, ref, watch} from "vue";
import {message} from 'ant-design-vue'
import {CloudCog, ClipboardCopy} from 'lucide-vue-next'
import type {Rule} from "ant-design-vue/es/form"
import type {StorageOptions} from '@/types'
import {genAuthorization, writeClipBoard} from '@/utils'
import {readDiskFileContent, writeDiskFileContent} from "@/stores/fs"
import {storageConfig} from '@/stores/storage-config'


const formRef = ref(null)
const form: StorageOptions = reactive({
  provider: storageConfig.provider,
  fetchTokenURL: storageConfig.fetchTokenURL,
  authorization: storageConfig.authorization,
  accountID: storageConfig.accountID,
  accessKeyID: storageConfig.accessKeyID,
  secretAccessKey: storageConfig.secretAccessKey,
  bucketName: storageConfig.bucketName,
})

const qiniuRules: Record<string, Rule[]> = {
  provider: [
    {required: true, message: '请选择存储方案', trigger: 'blur'},
  ],
  fetchTokenURL: [
    {required: true, message: '请填写网站地址', trigger: 'blur'},
    {required: true, validator: validateURL, trigger: 'change'}
  ],
  authorization: [
    {required: true, message: '请填写Authorization', trigger: 'blur'},
  ],
}
const r2Rules: Record<string, Rule[]> = {
  provider: [
    {required: true, message: '请选择存储方案', trigger: 'blur'},
  ],
  accountID: [
    {required: true, message: '请填写 Account ID', trigger: 'blur'},
  ],
  accessKeyID: [
    {required: true, message: '请填写 Access Key ID', trigger: 'blur'},
  ],
  secretAccessKey: [
    {required: true, message: '请填写 Secret Access Key', trigger: 'blur'},
  ],
  bucketName: [
    {required: true, message: '请填写 Bucket Name', trigger: 'blur'},
  ],
}
const rules = computed(() => {
  return form.provider === 'qiniu' ? qiniuRules : form.provider === 'R2' ? r2Rules : {
    provider: [
      {required: true, message: '请选择存储方案', trigger: 'blur'},
    ],
  }
})

async function validateURL(_rule: Rule, value: string) {
  if (!value) {
    return
  }

  try {
    const {protocol, hostname} = new URL(value)
    if (!['http:', 'https:'].includes(protocol)) {
      return Promise.reject('不支持的协议')
    } else if (!hostname) {
      return Promise.reject('网站地址非法')
    } else {
      return Promise.resolve()
    }
  } catch (e: any) {
    return Promise.reject('网站地址非法')
  }
}

function onGenBtnClick(evt: Event) {
  evt.preventDefault()

  form.authorization = genAuthorization()
}


const drawerVisibility = ref(false)

async function openDrawer() {
  drawerVisibility.value = true

  const options = await readDiskFileContent('.obsidian/publisher/storage.json')
  if (options) {
    Object.assign(form, JSON.parse(options))
  }
}

const btnLoading = ref(false)

async function save() {
  (formRef.value! as any).validate().then(async () => {
    btnLoading.value = true

    try {
      Object.assign(storageConfig, form)
      await writeDiskFileContent('.obsidian/publisher/storage.json', JSON.stringify(storageConfig, null, 2))
      drawerVisibility.value = false
      message.success('保存成功')
    } catch (e: any) {
      message.error(e.message)
    } finally {
      btnLoading.value = false
    }
  }).catch((e: any) => {
    // 表单验证失败
  })
}

async function copy() {
  await writeClipBoard(form.authorization)
  message.success('拷贝成功')
}
</script>

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
          <a-form-item label="存储方案" name="provider">
            <a-select v-model:value="form.provider" placeholder="选择存储方案">
              <a-select-option value="qiniu">七牛云</a-select-option>
              <a-select-option value="R2">Cloudflare R2</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16" v-if="form.provider === 'qiniu'">
        <a-col :span="12">
          <a-form-item label="网站地址" name="fetchTokenURL">
            <a-input type="url" v-model:value="form.fetchTokenURL" placeholder="输入网站地址" autocomplete="off"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Authorization" name="authorization">
            <a-input-group compact>
              <a-input v-model:value="form.authorization" placeholder="请输入 Authorization，推荐自动生成"
                       autocomplete="off" style="width: calc(100% - 32px)"/>
              <a-tooltip title="拷贝到剪切板">
                <a-button @click="copy">
                  <template #icon>
                    <ClipboardCopy/>
                  </template>
                </a-button>
              </a-tooltip>
            </a-input-group>
            <a href="#" @click="onGenBtnClick">Generate a Authorization</a>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16" v-if="form.provider === 'R2'">
        <a-col :span="12">
          <a-form-item label="Account ID" name="accountID">
            <a-input v-model:value="form.accountID" placeholder="输入 Account ID" autocomplete="off"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Access Key ID" name="accessKeyID">
            <a-input v-model:value="form.accessKeyID" placeholder="输入 Access Key ID" autocomplete="off"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Secret Access Key" name="secretAccessKey">
            <a-input v-model:value="form.secretAccessKey" placeholder="输入 Secret Access Key" autocomplete="off"/>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Bucket Name" name="bucketName">
            <a-input v-model:value="form.bucketName" placeholder="输入 Bucket Name" autocomplete="off"/>
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
