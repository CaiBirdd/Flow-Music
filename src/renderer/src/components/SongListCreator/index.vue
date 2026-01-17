<!-- 提供一个对话框用于创建歌单（标题、是否私密），提交后调用接口创建并刷新用户歌单列表。 -->
<script setup lang="ts">
import { createPlaylist } from '@/api/playlist'
import { ref } from 'vue'
import { getUserPlayListFn } from '@/utils/userInfo'
import { ElMessage } from 'element-plus'

// 双向绑定控制对话框显示的变量 (v-model="visible")
// default: false 表示默认不显示
const visible = defineModel({ default: false })
const loading = ref(false)
const title = ref('') // 歌单标题
const isPrivate = ref(false) //是否隐私歌单
const validateTitle = (val: string) => !!val.trim() || '请输入歌单标题' // 校验规则函数：如果不通过返回错误提示字符串，通过返回 true // !!val.trim() 确保输入不为空且不仅包含空格

// 重置表单状态 用于对话框关闭或者提交成功后
const resetForm = () => {
  title.value = ''
  isPrivate.value = false
  loading.value = false
}
//关闭对话框函数
const closeDialog = () => {
  visible.value = false
}
// 核心提交逻辑
const create = async () => {
  // 再次校验：如果标题为空，拦截并提示
  if (!title.value.trim()) {
    ElMessage.warning('请输入歌单标题')
    return
  }

  loading.value = true
  try {
    // 隐私歌单参数：'10'代表隐私，空字符串代表公开
    const privacyParam = isPrivate.value ? '10' : ''
    await createPlaylist(title.value, privacyParam)
    getUserPlayListFn()
    ElMessage.success('创建成功')
    closeDialog()
    resetForm()
  } catch (e: any) {
    ElMessage.error(e.message || '创建失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- 监听 update:modelValue 事件，在关闭时重置表单  :scrim="false"不让背景变暗
    @after-leave="resetForm": 动画结束、弹窗完全关闭后，自动重置表单-->
  <v-dialog v-model="visible" :scrim="false" max-width="400" @after-leave="resetForm">
    <v-card rounded="lg">
      <v-card-title class="d-flex justify-space-between align-center">
        <div class="text-h5 text-medium-emphasis ps-2">创建歌单</div>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="title"
          label="歌单标题"
          placeholder="请输入歌单标题"
          autofocus
          variant="outlined"
          :rules="[validateTitle]"
          :counter="40"
          @keydown.enter="create"
        ></v-text-field>

        <v-checkbox-btn
          v-model="isPrivate"
          class="mb-4"
          label="隐私歌单"
          color="primary"
        ></v-checkbox-btn>

        <v-btn
          :loading="loading"
          :disabled="!title.trim()"
          class="text-none"
          color="primary"
          text="创建"
          variant="flat"
          block
          @click="create"
        ></v-btn>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
