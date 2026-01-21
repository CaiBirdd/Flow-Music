<script setup lang="ts">
import { ref, onMounted, onUnmounted, UnwrapRef, useTemplateRef } from 'vue'
import { useUserInfo } from '@/store'
import { useMusicAction } from '@/store/music'
import ProgressBar from '@/components/MusicPlayer/ProgressBar.vue'
import { GetMusicDetailData } from '@/api/musicList'
import DetailLeft from '@/components/MusicPlayer/DetailLeft.vue'
import DetailCenter from '@/components/MusicPlayer/DetailCenter.vue'
import DetailRight from '@/components/MusicPlayer/DetailRight.vue'
import { LyricPlayer } from '@/utils/lyric'
import '@/utils/lyric/style.scss'

// -----------------------------------------------------------------------------
// 基础设施区 Types & Constants
// -----------------------------------------------------------------------------

// 播放模式图标映射: 列表循环 | 随机 | 单曲循环
/**
 * userAudio 类型：
 * 这是一个“混合体”，它既包含了原生 HTMLAudioElement 的所有属性
 * 又覆盖（Omit）并重写了 play 和 pause 方法。
 * 目的：为了实现自定义的“音量淡入淡出”效果，而不是默认的生硬启停。
 * lengthen控制淡入淡出 isNeed控制图标变不变
 * 因为淡入淡出是异步所以返回promise
 */
type userAudio = {
  play: () => Promise<undefined>
  pause: (isNeed?: boolean) => Promise<undefined>
} & Omit<HTMLAudioElement, 'pause' | 'play'>

// 向外暴露的全局实例接口
// 这里定义的属性都可以通过 `window.$audio.xxx` 在全站任何地方访问
export interface MusicPlayerInstanceType {
  el: UnwrapRef<userAudio> // 核心：直接暴露改装后的 Audio Dom元素，它保证了类型定义和 Vue 自动解包后的运行时行为一致。相当于调用时不用加.value了
  isPlay: UnwrapRef<boolean> // 核心：响应式的播放状态
  reset: (val: boolean) => void // 重置播放器状态
  pause: (isNeed?: boolean) => Promise<undefined> // 暴露我们魔改后的 pause
  play: () => Promise<undefined> // 暴露我们魔改后的 play
  resetLyricPlayer: () => void // 重置歌词播放状态
}

interface Props {
  src: string // 音乐文件 URL
  currentSong: GetMusicDetailData // 歌曲详情数据
}

// -----------------------------------------------------------------------------
// 核心状态区 Setup & State
// -----------------------------------------------------------------------------

const props = defineProps<Props>()

// 状态仓库
const store = useUserInfo() // 用户信息
const music = useMusicAction() // 音乐数据

// 核心状态 Refs
// 使用 Vue 3.5+ 的 useTemplateRef 明确这是一个 DOM 引用，而非普通数据
const audio = useTemplateRef<userAudio>('audio')
const isPlay = ref(false)

// 保存原生 Audio 方法的变量，用于在劫持后也能调用原生能力
let originPlay: HTMLMediaElement['play']
let originPause: HTMLMediaElement['pause']

// -----------------------------------------------------------------------------
// 播放控制区 Region: playback Control (Volume Transition Logic)
// -----------------------------------------------------------------------------

let timer: NodeJS.Timeout // 全局音量渐变定时器

/**
 * 音量渐变核心算法
 * @param targetVolume 目标音量 (用户设置的最大音量)
 * @param type 'in'=渐入(0->vol), 'out'=渐出(vol->0)
 */
function transitionVolume(targetVolume: number, type: 'in' | 'out' = 'in'): Promise<undefined> {
  clearInterval(timer) // 清除上一次未完成的渐变
  const playVolume = 15 // 渐入步长
  const pauseVolume = 10 // 渐出步长

  //构造函数是立即执行的
  return new Promise((resolve) => {
    if (!audio.value) {
      resolve(undefined)
      return
    }

    // 分支1：渐入 (Volume Up)
    if (type === 'in') {
      //循环在这，定时器
      timer = setInterval(() => {
        if (!audio.value) {
          clearInterval(timer)
          resolve(undefined)
          return
        }
        // 每次增加一点音量
        audio.value.volume = Math.min(audio.value.volume + targetVolume / playVolume, targetVolume)
        // 达到目标音量，停止
        if (audio.value.volume >= targetVolume) {
          resolve(undefined)
          clearInterval(timer)
        }
      }, 50)
      return
    }

    // 分支2：渐出 (Volume Down)
    timer = setInterval(() => {
      if (!audio.value) {
        clearInterval(timer)
        resolve(undefined)
        return
      }
      // 每次减少一点音量
      audio.value.volume = Math.max(audio.value.volume - targetVolume / pauseVolume, 0)

      // 真正静音后，才执行原生 pause
      if (audio.value.volume <= 0) {
        clearInterval(timer)
        originPause.call(audio.value) // <--- 真正的物理暂停 我们之前只是让声音为0，调用原生而不是自己，掉自己会递归死循环
        audio.value.volume = targetVolume // 恢复音量值，为下一次播放做准备
        resolve(undefined)
      }
    }, 50)
  })
}

// 播放函数 (由 UI 触发或逻辑触发)
function play() {
  let volume = store.volume // 获取目标音量（用户设置的）

  // 如果处于加载状态，强制重置歌词播放器
  if (music.state.load) {
    resetLyricPlayer()
    music.state.load = false
  }

  lyricPlayer?.play() // 启动歌词滚动

  if (!audio.value) return Promise.resolve(undefined)

  audio.value.volume = 0 // 先设置为0，确保音量渐变从0开始

  // 调用原生 play 方法真正开始加载流
  originPlay.call(audio.value).catch(() => {
    // 音频源无效时静默处理（常见于自动播放策略拦截）
  })

  isPlay.value = true // UI 变更为播放图标
  timeState.value.stop = false // 允许进度条自动更新

  // 执行音量渐变：从 0 -> target
  return transitionVolume(volume, 'in').then(() => {})
}

// 暂停函数
function pause(isNeed: boolean = true) {
  let volume = store.volume

  // isNeed: 只有用户主动点击暂停时才为 true，切歌时的自动暂停为 false
  isNeed && (isPlay.value = false)

  // 执行音量渐变：从 current -> 0
  return transitionVolume(volume, 'out').then(() => {
    lyricPlayer?.pause() // 渐变结束后，歌词停止
  })
}

// 重置播放器
const reset = (val: boolean) => {
  music.state.currentTime = 0 //把进度条直接拉回起点
  isPlay.value = val
  // 暂停时上锁锁住进度条，防止旧音频的timeupdate事件导致进度条回弹闪烁
  timeState.value.stop = true
}

// -----------------------------------------------------------------------------
// 歌词系统区 Region: Lyric System
// -----------------------------------------------------------------------------
let lyricPlayer: LyricPlayer | null = null // 歌词播放器实例 必须在函数外面定义，要不然找不到啊

// 初始化歌词播放器
function initLyricPlayer() {
  const container = document.querySelector('.lyric-container') as HTMLDivElement
  if (!container || !audio.value) return

  // 内存优化: 如果已存在player实例，先销毁再创建新实例
  if (lyricPlayer) {
    lyricPlayer.destroy()
  }

  lyricPlayer = new LyricPlayer({
    container,
    audio: audio.value as unknown as HTMLAudioElement,
    onLineClick: handleLyricClick // 歌词点击回调传入
  })
}

const resetLyricPlayer = () => {
  initLyricPlayer() // 重置歌词解析器
  lyricPlayer?.setLyrics(music.state.lyric, music.state.noTimestamp) // 设置新歌词
}

// 歌词点击回调
function handleLyricClick(time: number) {
  if (audio.value) {
    audio.value.currentTime = time
  }
}

// -----------------------------------------------------------------------------
// 进度与事件区 Region: Progress & Playback Events
// -----------------------------------------------------------------------------

// 进度条状态管理 目的是为了切歌稳定性
const timeState = ref({
  stop: false // 互斥锁：在切歌/重置期间变为true，防止旧Audio对象的timeupdate事件污染Store状态
})

// 核心：时间更新回调 (由 <audio @timeupdate> 触发)
const timeupdate = () => {
  if (timeState.value.stop) return
  if (audio.value) {
    // 直接读取 ref 上的 currentTime 同步到全局 store
    music.state.currentTime = audio.value.currentTime
  }
}

// 拖动歌曲进度条后的回调：同步歌词进度
function seeked() {
  lyricPlayer?.syncIndex()
}

// 播放模式切换逻辑 (循环/随机/单曲)
const setOrderHandler = () => {
  // 计算下一个模式的索引 (共3种模式：0列表, 1随机, 2单曲)
  let newValue = (music.state.orderStatusVal + 1) % 3
  music.state.orderStatusVal = newValue as typeof music.state.orderStatusVal
}

// -----------------------------------------------------------------------------
// 生命周期与暴露区 Region: Lifecycle & Expose
// -----------------------------------------------------------------------------

onMounted(() => {
  initLyricPlayer() //歌词系统先跑起来

  // --- 关键黑魔法：方法劫持 (Monkey Patching) ---
  // A. 备份原生方法 !是非空断言
  originPlay = audio.value!.play as HTMLMediaElement['play']
  originPause = audio.value!.pause as HTMLMediaElement['pause']

  // B. 覆盖为自定义方法
  // 这样无论谁调用 audio.play()，都会走我们的渐变逻辑
  audio.value!.play = play as any
  audio.value!.pause = pause as any
})

onUnmounted(() => {
  // 1. 清理音量渐变定时器
  clearInterval(timer)

  // 2. 销毁歌词实例
  if (lyricPlayer) {
    lyricPlayer.destroy()
    lyricPlayer = null
  }

  // 3. 清理 DOM 事件引用
  if (audio.value) {
    audio.value.oncanplay = null
  }
})

// 最终暴露对象
const exposeObj = {
  el: audio,
  isPlay,
  reset,
  play,
  pause,
  resetLyricPlayer
}
defineExpose(exposeObj) // 挂载到 window.$audio 上的就是这个对象
</script>

<template>
  <div class="bottom-container">
    <!-- @timeupdate="timeupdate" 监听时间更新
      @ended会尝试将原生event对象传入，不过由于playEnd不需要参数，这样写没问题   监听播放结束
      @seeked="seeked"           监听拖动进度条 -->
    <audio
      ref="audio"
      :src="props.src"
      preload="auto"
      @timeupdate="timeupdate"
      @ended="music.playEnd()"
      @seeked="seeked"
    />
    <DetailLeft :current-song="props.currentSong" />
    <!-- 监听子组件传来的事件 cut-song又往上传了一级-->
    <DetailCenter
      :is-play="isPlay"
      :order-status-val="music.state.orderStatusVal"
      @play="play"
      @pause="pause"
      @cut-song="(val) => music.cutSongHandler(val)"
      @set-order-handler="setOrderHandler"
    />
    <DetailRight
      :current-time="music.state.currentTime"
      :current-song="props.currentSong"
      :audio="audio"
    />
  </div>
  <div class="plan-container">
    <ProgressBar :current-song="props.currentSong" />
  </div>
</template>

<style lang="scss" scoped>
/* 进度条的外壳 */
.plan-container {
  display: flex;
  align-items: center;
  height: 15px;
  position: absolute;
  top: -8.5px;
  width: 100%;
}
/* 穿透修改 Element Plus 的抽屉样式 */
:deep(.el-drawer) {
  height: 100%;
}
/* 播放器主体容器 */
.bottom-container {
  display: flex;
  justify-content: space-between; /* 左中右三块分散对齐 */
  align-items: center;
  height: 100%;
  padding: 0 15px;
  /*
   * backdrop-filter 性能优化:
   * 1. 降低blur值从60px到40px，减少GPU采样计算
   * 2. 使用will-change提示浏览器预优化
   * 3. 使用transform开启GPU合成层
   */
  /* 半透明毛玻璃核心：背景模糊40px，饱和度提升180% (让颜色更鲜艳好看) */
  backdrop-filter: blur(40px) saturate(180%);
  will-change: backdrop-filter;
  transform: translate3d(0, 0, 0);
  /*隐藏背面 (也是为了配合 GPU 加速，减少不必要的渲染计算) */
  backface-visibility: hidden;
}
</style>
