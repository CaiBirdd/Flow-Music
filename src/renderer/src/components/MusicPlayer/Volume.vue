<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUserInfo } from '@/store'

interface Props {
  audio: HTMLAudioElement // 接收父组件传递过来的原生 HTMLAudioElement 对象,内部组件控制全局audio标签
}
const props = defineProps<Props>()
const model = ref(0) // 绑定el-slider 滑块,音量范围是 0-1，但滑块是 0-100，所以需要转换
const store = useUserInfo()

//将滑块的 0-100 数值转换为 Audio 需要的 0-1 小数
const volume = computed(() => {
  return model.value / 100
})

// 监听 props.audio 是否就绪 这是因为 audio 元素可能在组件挂载时尚未完全加载
watch(
  () => props.audio,
  () => {
    // 初始化：从 localStorage 读取用户上次设置的音量，如果没有则默认为 1 (100%)
    const volume = Number(localStorage.getItem('volume') || 1)
    model.value = volume * 100
    // 设置全局 audio 元素的音量
    window.$audio.el.volume = volume
    // 同步更新到 Pinia store 中
    store.volume = volume
  }
)
//点击喇叭静音和恢复
const volumeHandler = (target: boolean) => {
  const volume = Number(localStorage.getItem('volume') || 1)
  model.value = target ? 0 : volume * 100
  window.$audio.el.volume = model.value / 100 //bug修复 点图标没静音
  store.volume = model.value / 100
}
let timer: NodeJS.Timeout
// 拖动滑块时的实时回调 (el-slider @input 事件)
const input = () => {
  window.$audio.el.volume = volume.value
  //防抖处理 避免用户拖动过程中频繁写入 localStorage 导致性能问题
  clearTimeout(timer)
  timer = setTimeout(() => {
    localStorage.setItem('volume', String(volume.value))
  }, 50)
}
// 滑块值改变后的回调 (el-slider @change 事件，通常指松开鼠标后)
const change = () => {
  store.volume = volume.value
}
</script>

<template>
  <div class="volume-box">
    <!-- 图标切换逻辑：音量不为0显示正常喇叭，为0显示静音图标 -->
    <i v-if="volume !== 0" class="iconfont icon-yinliang" @click="volumeHandler(true)" />
    <i v-else class="iconfont icon-jingyin" @click="volumeHandler(false)" />
    <!-- 音量滑块 -->
    <!-- show-tooltip="false": 拖动时不显示数字提示框 -->
    <!-- show-stops="false": 不显示刻度 -->
    <el-slider
      v-model="model"
      :show-tooltip="false"
      :show-stops="false"
      style="width: 80px; overflow: hidden"
      @change="change"
      @input="input"
    />
  </div>
</template>

<style scoped lang="scss">
.volume-box {
  width: 150px;
  display: flex;
  align-items: center;
  .icon-yinliang {
    font-size: 18px;
  }
  .iconfont {
    cursor: pointer;
    //transform: translateY(-50%);
    //position: absolute;
    //top: 50%;
    color: $text;
    margin-right: 8px;
  }
  .iconfont:hover {
    color: white;
  }
}

// 样式穿透 (:deep)，用于修改 Element Plus 组件内部样式
:deep(.el-slider) {
  //width: 130px !important;
}
:deep(.el-slider__button-wrapper) {
  cursor: pointer !important;
}
// 隐藏默认的滑块圆点 (button)，让外观更简洁
:deep(.el-slider__button) {
  display: none;
}
// 自定义滑块条颜色 (红色)
:deep(.el-slider__bar) {
  background-color: rgb(236, 65, 65);
  height: 5px;
  border-radius: 3px;
}
// 自定义滑块背景槽颜色 (半透明白)
:deep(.el-slider__runway) {
  height: 5px;
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
