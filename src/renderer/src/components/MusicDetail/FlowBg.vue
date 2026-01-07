<script setup lang="ts">
import { colorExtraction, gradualChange, useRhythm } from '@/components/MusicDetail/useMusic'
import { onMounted, ref, watch } from 'vue'
import { findBestColors, toggleImg } from '@/utils'
import { useMusicAction } from '@/store/music'
import { useSettings } from '@/store/settings'
import { useFlags } from '@/store/flags'

// props 定义：接收父组件传来的封面图链接
interface Props {
  bg: string
}
const props = defineProps<Props>()

const bestColors = ref<any[]>([]) // 存最后选定的那一组"最好看"的颜色
const rgb = ref<any[]>([]) // 存原始提取出的所有颜色板。
const music = useMusicAction() // music: 负责管音乐播放。这里主要用它来把算出来的背景色"广播"给全APP（比如底部播放条要变色）
const settings = useSettings() // settings: 负责管设置。这里主要用它来获取用户设置的"歌词背景"模式。
const flags = useFlags() // flags: 负责管全局状态。这里主要用它来判断详情页是否打开（休眠机制）。

// 保存 rhythmBox 和 splitImg 引用，供唤醒时使用 存 useMusic.ts 里返回的工具，留着切歌时用
let rhythmBoxRef: HTMLDivElement | null = null
let splitImgFn: ((img: HTMLImageElement) => void) | null = null

/**
 * 执行完整的背景渲染逻辑
 * 包括：颜色提取、渐变背景、节律背景
 */
const executeFullRender = (bg: string, lyricBg: string) => {
  // 把 url 字符串变成真正的 HTMLImageElement 对象
  toggleImg(bg, '200y200').then((img) => {
    rgb.value = colorExtraction(img)
    bestColors.value = findBestColors(rgb.value, 2) // 找出最好的两组颜色
    music.updateBgColor(bestColors.value) //广播全局
    gradualChange(img, bestColors.value) //双缓冲切歌背景过渡
    // 只有节律背景模式才执行 splitImg（Canvas绘图 + CSS规则插入）
    if (lyricBg === 'rhythm' && rhythmBoxRef && splitImgFn) {
      splitImgFn(img)
    }
  })
}

/**
 * 执行轻量级渲染（仅颜色提取，给底部播放栏使用）
 * 不执行 gradualChange 和 splitImg，避免后台GPU开销
 */
const executeLightRender = (bg: string) => {
  toggleImg(bg, '200y200').then((img) => {
    rgb.value = colorExtraction(img)
    bestColors.value = findBestColors(rgb.value, 2)
    music.updateBgColor(bestColors.value) // 只广播颜色，结束。不碰 DOM，不碰 Canvas。
  })
}

onMounted(() => {
  // 拿到那个用来放旋转碎片的 div 容器
  rhythmBoxRef = document.querySelector('#rhythm-box') as HTMLDivElement
  const { splitImg } = useRhythm(rhythmBoxRef)
  splitImgFn = splitImg

  // 图片切换时，更新流动背景
  watch(
    [() => props.bg, () => settings.state.lyricBg],
    ([bg, lyricBg]) => {
      if (!bg) {
        return
      }

      /**
       * 性能优化 - 休眠机制
       * 问题：MusicDetail 组件使用 CSS transform 隐藏而非 v-if 销毁，
       *       导致 onUnmounted 永不触发，后台切歌时仍执行重渲染逻辑。
       * 解决：当详情页关闭时，只执行轻量级颜色提取（给底部栏用），
       *       跳过 gradualChange 和 splitImg 等高开销操作。
       */
      if (!flags.isOpenDetail) {
        // 详情页关闭时：仅更新颜色，不执行 Canvas/CSS/DOM 操作
        executeLightRender(bg)
        return
      }

      // 详情页打开时：执行完整渲染流程
      executeFullRender(bg, lyricBg)
    },
    {
      immediate: true // 一上来就先执行一次，不然第一首歌没背景
    }
  )

  /**
   * 唤醒机制 监听详情页打开状态
   * 当用户打开详情页时，补做一次完整渲染，确保背景正确显示
   * 如果用户之前在后台切了歌（那是轻量渲染），现在突然点开了详情页，背景是旧的怎么办？
   * 这个监听器就是负责"补票"的。
   */
  watch(
    () => flags.isOpenDetail,
    (isOpen) => {
      if (isOpen && props.bg) {
        // 唤醒时执行完整渲染
        executeFullRender(props.bg, settings.state.lyricBg)
      }
    }
  )
})
</script>

<template>
  <div class="flow-bg-container">
    <div id="gradual1" />
    <div id="gradual2" />
    <div v-show="settings.state.lyricBg === 'rhythm'" id="rhythm-box" />
  </div>
</template>

<style scoped lang="scss">
/* 
 * 流动背景性能优化说明:
 * 1. 使用 will-change 提示浏览器预先优化
 * 2. 使用 transform: translate3d(0,0,0) 开启GPU硬件加速
 * 3. 使用 contain 属性限制重绘范围
 * 4. 降低 blur 值从 120px 到 80px，在保持效果的同时减少GPU开销
 */
.flow-bg-container {
  position: absolute;
  width: 100%;
  height: 100%;
  /* 使用contain限制布局计算范围 */
  contain: layout style;
}

#gradual1,
#gradual2 {
  height: 100%;
  width: 100%;
  transition: opacity 1s ease-out;
  position: absolute;
  /* GPU加速 */
  will-change: opacity, background-image;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden; /*防止旋转时背面闪烁，虽然这里没用到 */
}

#rhythm-box {
  position: absolute;
  width: 100%;
  height: 100%;
  /* 
   * 性能优化: 将blur从120px降低到80px
   * 80px的模糊效果视觉上差异不大，但GPU开销显著降低
   * 模糊半径越大，需要采样的像素越多，计算量呈指数增长
   */
  filter: blur(80px);
  /* GPU加速优化 */
  will-change: filter;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  /* 限制重绘范围 */
  contain: layout style paint;
  /* 子元素样式: 那些被插入进来的小 div 碎片 */
  :global(.cut-image) {
    transition: background-image 0.3s linear;
    /* 已在JS中添加will-change和contain */
  }
}
</style>
