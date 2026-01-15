<script setup lang="ts">
import { ref } from 'vue'
import { useSettings } from '@/store/settings'
import { checkUrlValidity, isElectron } from '@/utils'
import Versions from '@/components/Versions.vue'
import { ElMessage } from 'element-plus'
import { useUserInfo } from '@/store'

const settings = useSettings()
const store = useUserInfo()
// 用来控制 "确认" 按钮是否可用，以及显示错误信息
const urlVerify = ref({
  message: '',
  isValid: true
})
//表单数据 初始值从store中获取
const settingForm = ref({
  url: settings.state.baseUrl,
  font: settings.state.font
})
//验证url是否有效
const validateUrl = (value: any) => {
  if (!value) {
    urlVerify.value = {
      message: '地址不能为空',
      isValid: false
    }
    return '地址不能为空'
  }
  //调用工具函数验证url是否有效
  const result = checkUrlValidity(value)
  urlVerify.value = result

  return result.isValid || result.message
}
//设置base url
const setBaseUrl = () => {
  settings.setState({
    baseUrl: settingForm.value.url
  })
  ElMessage.success({
    message: '修改网络域成功'
  })
}
// 切换歌词页背景模式 rhythm: 模糊动态背景 rgb: 纯色渐变背景
const updateBg = (value: any) => {
  settings.setState({
    lyricBg: value
  })
}
// 切换全局粗体
const updateBold = (value: any) => {
  settings.setState({
    bold: value
  })
  if (value) {
    document.body.classList.add('bold')
  } else {
    document.body.classList.remove('bold')
  }
}
// 设置全局字体
const setFont = () => {
  settings.setState({
    font: settingForm.value.font
  })
  const appEl = document.querySelector('#app') as HTMLDivElement
  if (appEl) {
    appEl.style.fontFamily = settingForm.value.font
    ElMessage.success({
      message: '字体设置成功'
    })
  }
}
// 恢复出厂设置
// 调用 Pinia store 的 $reset 方法，重置所有状态为默认值
const recoverDefaultSettings = () => {
  settings.$reset()
}
//退出登录
const quitLogin = () => {
  localStorage.clear() //清空所有缓存
  location.reload() //页面刷新，回到未登录态
}
</script>

<template>
  <div class="padding-container">
    <div>
      <!-- 歌词背景模式 -->
      <v-btn-toggle
        v-model="settings.state.lyricBg"
        density="compact"
        @update:model-value="updateBg"
      >
        <v-btn class="small" size="default" value="rhythm">模糊背景</v-btn>
        <v-btn size="default" value="rgb">纯色模式</v-btn>
      </v-btn-toggle>
      <!-- 问号提示图标 -->
      <v-tooltip>
        <template #activator="{ props }">
          <v-btn
            class="ma-2"
            size="small"
            variant="text"
            icon="mdi-help-circle-outline"
            v-bind="props"
          >
          </v-btn>
        </template>
        <!-- Tooltip 内容 -->
        <div>
          <h3>设置歌词页背景</h3>
          <p>模糊背景：通过图片拼接的方式在四角旋转来呈现动态背景方式</p>
          <p>纯色模式：通过取图片的两种主色调来呈现的背景颜色，对于网络环境和电脑性能支持更好</p>
        </div>
      </v-tooltip>
    </div>
    <!-- 设置base url rules绑定校验函数-->
    <v-text-field
      v-model="settingForm.url"
      width="600"
      density="compact"
      :persistent-clear="!urlVerify.isValid"
      clearable
      hide-details="auto"
      single-line
      variant="solo-filled"
      prepend-inner-icon="mdi-network-pos"
      :rules="[validateUrl]"
      :placeholder="settings.state.baseUrl"
    >
      <!-- 内部后置插槽：放置“确认”按钮 -->
      <template #append-inner>
        <v-btn
          :disabled="!urlVerify.isValid"
          base-color="rgba(76, 175, 80, 0.8)"
          @click="setBaseUrl"
          >确认</v-btn
        >
      </template>
      <!-- 外部后置插槽：放置问号提示 -->
      <template #append>
        <v-tooltip>
          <template #activator="{ props }">
            <v-btn size="small" variant="text" icon="mdi-help-circle-outline" v-bind="props">
            </v-btn>
          </template>
          <div>
            <p>用来动态设置网络域,例如服务器ip地址可能会有变动</p>
            <p>注意：如果第一次没有连接上服务器，则需要重新启动应用加载</p>
          </div>
        </v-tooltip>
      </template>
    </v-text-field>
    <!-- 全局字体 -->
    <v-text-field
      v-model="settingForm.font"
      width="600"
      density="compact"
      clearable
      hide-details="auto"
      single-line
      variant="solo-filled"
      prepend-inner-icon="mdi-format-font"
      placeholder="设置全局字体"
    >
      <template #append-inner>
        <v-btn :disabled="!urlVerify.isValid" base-color="rgba(76, 175, 80, 0.8)" @click="setFont"
          >确认</v-btn
        >
      </template>
      <template #append>
        <v-tooltip>
          <template #activator="{ props }">
            <v-btn size="small" variant="text" icon="mdi-help-circle-outline" v-bind="props">
            </v-btn>
          </template>
          <div>
            <p>设置全局字体</p>
          </div>
        </v-tooltip>
      </template>
    </v-text-field>
    <!-- 全局加粗开关 -->
    <v-switch
      v-model="settings.state.bold"
      label="全局字体加粗"
      @update:model-value="updateBold"
    ></v-switch>

    <v-btn style="width: 110px" base-color="rgba(255,255,255,0.1)" @click="recoverDefaultSettings"
      >恢复默认设置</v-btn
    >
    <v-btn v-if="store.isLogin" style="width: 110px; margin-top: 20px" @click="quitLogin"
      >退出登录</v-btn
    >
    <!-- 版本号组件 -->
    <Versions v-if="isElectron()"></Versions>
  </div>
</template>

<style lang="scss" scoped>
.padding-container {
  display: grid;
  gap: 10px;
}
</style>
