<script setup lang="ts">
import { ref, onMounted, onUnmounted, UnwrapRef } from 'vue'
import { useUserInfo } from '@/store'
import { useMusicAction } from '@/store/music'
import ProgressBar from '@/components/MusicPlayer/ProgressBar.vue'
import { GetMusicDetailData } from '@/api/musicList'
import DetailLeft from '@/components/MusicPlayer/DetailLeft.vue'
import DetailCenter from '@/components/MusicPlayer/DetailCenter.vue'
import DetailRight from '@/components/MusicPlayer/DetailRight.vue'
import { ListenerName, useListener } from '@/components/MusicPlayer/listener'
import usePlayList, { playListState } from '@/layout/BaseAside/usePlayList'
import { LyricPlayer } from '@/utils/lyric'
import '@/utils/lyric/style.scss'

// -----------------------------------------------------------------------------
// 基础设施区 Types & Constants
// -----------------------------------------------------------------------------

// 播放模式图标映射: 心动 | 列表循环 | 随机 | 单曲循环
const orderStatus = ['icon-xihuan5', 'icon-xunhuan', 'icon-suijibofang', 'icon-danquxunhuan']

/**
 * userAudio 类型：
 * 这是一个“混合体”，它既包含了原生 HTMLAudioElement 的所有属性
 * 又覆盖（Omit）并重写了 play 和 pause 方法。
 * 目的：为了实现自定义的“音量淡入淡出”效果，而不是默认的生硬启停。
 */
type userAudio = {
  play: (lengthen?: boolean) => Promise<undefined>
  pause: (isNeed?: boolean, lengthen?: boolean) => Promise<undefined>
} & Omit<HTMLAudioElement, 'pause' | 'play'>

// 向外暴露的全局实例接口
// 这里定义的属性都可以通过 `window.$audio.xxx` 在全站任何地方访问
export interface MusicPlayerInstanceType {
  el: UnwrapRef<userAudio> // 核心：直接暴露改装后的 Audio Dom元素
  isPlay: UnwrapRef<boolean> // 核心：响应式的播放状态
  reset: (val: boolean) => void // 重置播放器状态
  pause: typeof pause // 暴露我们魔改后的 pause
  play: typeof play // 暴露我们魔改后的 play
  transitionIsPlay: UnwrapRef<boolean> // 过渡状态（用于歌词平滑滚动）
  addListener: (listener: ListenerName) => void // 给外部组件添加生命周期监听的能力
  cutSongHandler: () => void // 切歌处理器
}

interface Props {
  src: string // 音乐文件 URL
  ids?: number[] // 歌曲 ID 列表
  songs: GetMusicDetailData // 歌曲详情数据
}

// -----------------------------------------------------------------------------
// 核心状态区 Setup & State
// -----------------------------------------------------------------------------

const props = defineProps<Props>()
const emit = defineEmits(['playEnd', 'cutSong']) // 播放结束、切歌

// 状态仓库
const store = useUserInfo() // 用户信息
const music = useMusicAction() // 音乐数据

// 核心状态 Refs
const audio = ref<userAudio>() // 绑定到模板 <audio ref="audio">
const isPlay = ref(false)

// 组合式函数
const { addListener, executeListener } = useListener(audio) // 初始化事件监听器系统
const { getPlayListDetailFn } = usePlayList() // 初始化歌单获取能力

// -----------------------------------------------------------------------------
// 核心音频辅助区 Region: Audio Core Helpers
// -----------------------------------------------------------------------------

// 内存优化: 错误处理函数，提取出来是为了方便 removeEventListener
const audioErrorHandler = (event: any) => {
  if (event.target.error.code === 4) {
    // 音频源无效 error code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED
  }
}

// 保存原生 Audio 方法的变量，用于在劫持后也能调用原生能力
let originPlay: HTMLMediaElement['play']
let originPause: HTMLMediaElement['pause']

// -----------------------------------------------------------------------------
// 播放控制区 Region: playback Control (Volume Transition Logic)
// -----------------------------------------------------------------------------

let timer: NodeJS.Timeout // 全局音量渐变定时器
const transitionIsPlay = ref(false) // 这是一个细节点：即使调用了 pause，在音量渐出期间，这个值依然为 true，保证歌词不会立刻停顿

/**
 * 音量渐变核心算法
 * @param volume 目标音量
 * @param target true=渐入(0->vol), false=渐出(vol->0)
 * @param lengthen 是否延长时间（步长更小，过渡更平滑）
 */
function transitionVolume(
  volume: number,
  target: boolean = true,
  lengthen: boolean = false
): Promise<undefined> {
  clearInterval(timer) // 清除上一次未完成的渐变
  const playVolume = lengthen ? 40 : 15 // 渐入步长
  const pauseVolume = lengthen ? 20 : 10 // 渐出步长

  return new Promise((resolve) => {
    if (!audio.value) {
      resolve(undefined)
      return
    }

    // 分支1：渐入 (Volume Up)
    if (target) {
      timer = setInterval(() => {
        if (!audio.value) {
          clearInterval(timer)
          resolve(undefined)
          return
        }
        // 每次增加一点音量
        audio.value.volume = Math.min(audio.value.volume + volume / playVolume, volume)
        // 达到目标音量，停止
        if (audio.value.volume >= volume) {
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
      audio.value.volume = Math.max(audio.value.volume - volume / pauseVolume, 0)

      // 真正静音后，才执行原生 pause
      if (audio.value.volume <= 0) {
        clearInterval(timer)
        originPause.call(audio.value) // <--- 真正的物理暂停
        audio.value.volume = volume // 恢复音量值，为下一次播放做准备
        resolve(undefined)
      }
    }, 50)
  })
}

// 播放函数 (由 UI 触发或逻辑触发)
function play(lengthen: boolean = false) {
  let volume = store.volume // 获取目标音量（用户设置的）

  // 如果处于加载状态，强制切歌重置
  if (music.state.load) {
    cutSongHandler()
    music.state.load = false
  }

  player?.play() // 启动歌词滚动

  if (!audio.value) return Promise.resolve(undefined)

  audio.value.volume = 0 // 先设置为0，确保音量渐变从0开始

  // 调用原生 play 方法真正开始加载流
  originPlay.call(audio.value).catch(() => {
    // 音频源无效时静默处理（常见于自动播放策略拦截）
  })

  isPlay.value = true // UI 变更为播放图标
  timeState.value.stop = false // 允许进度条自动更新
  transitionIsPlay.value = true // 歌词状态：播放

  // 执行音量渐变：从 0 -> target
  return transitionVolume(volume, true, lengthen).then(() => {})
}

// 暂停函数
function pause(isNeed: boolean = true, lengthen: boolean = false) {
  let volume = store.volume

  // isNeed: 只有用户主动点击暂停时才为 true，切歌时的自动暂停为 false
  isNeed && (isPlay.value = false)

  // 执行音量渐变：从 current -> 0
  return transitionVolume(volume, false, lengthen).then(() => {
    player?.pause() // 渐变结束后，歌词停止
    transitionIsPlay.value = false // 歌词状态：暂停
  })
}

// 重置播放器
const reset = (val: boolean) => {
  music.state.currentTime = 0
  isPlay.value = val
  transitionIsPlay.value = val
  // 暂停时锁住进度条，防止timeupdate事件导致进度条回弹
  timeState.value.stop = true
}

// -----------------------------------------------------------------------------
// 歌词系统区 Region: Lyric System
// -----------------------------------------------------------------------------

let player: LyricPlayer | null = null // 歌词播放器实例
const cutSongHandler = () => {
  initPlayer() // 重置歌词解析器
  player?.setLyrics(music.state.lyric, music.state.noTimestamp) // 设置新歌词
  executeListener('cutSong') // 触发切歌事件钩子
}

// 歌词点击回调
function handleLyricClick(time: number) {
  if (audio.value) {
    audio.value.currentTime = time
  }
}

// 初始化歌词播放器
function initPlayer() {
  const container = document.querySelector('.lyric-container') as HTMLDivElement
  if (!container || !audio.value) return

  // 内存优化: 如果已存在player实例，先销毁再创建新实例
  if (player) {
    player.destroy()
  }

  player = new LyricPlayer({
    container,
    audio: audio.value as unknown as HTMLAudioElement,
    onLineClick: handleLyricClick // 歌词点击回调传入
  })
}

// -----------------------------------------------------------------------------
// 进度与事件区 Region: Progress & Playback Events
// -----------------------------------------------------------------------------

// 进度条状态管理
const timeState = ref({
  stop: false, // 拖拽时锁死，防止进度条回弹
  previousTime: 0
})

// 核心：时间更新回调 (由 <audio @timeupdate> 触发)
const timeupdate = () => {
  if (timeState.value.stop) return
  timeState.value.previousTime = music.state.currentTime
  if (window.$audio) {
    // 直接读取原生 currentTime 同步到全局 store
    music.state.currentTime = (window.$audio.el as HTMLAudioElement).currentTime
  }
}

// 拖动歌曲进度条后的回调：同步歌词进度
function seeked() {
  player?.syncIndex()
}

// 播放结束回调
const end = () => {
  emit('playEnd')
}

// 播放模式切换逻辑 (心动/循环/随机)
const setOrderHandler = () => {
  const runtimeList = music.state.runtimeList
  // 计算下一个模式的索引
  let newValue = (music.state.orderStatusVal + 1) % orderStatus.length

  // 特殊逻辑：如果从"心动模式"切走，且当前列表是"我喜欢的"，则需要刷新列表
  if (runtimeList?.specialType === 5 && music.state.orderStatusVal === 0 && newValue !== 0) {
    getPlayListDetailFn(runtimeList.id as number, '', false)
    music.updateTracks(
      playListState.value.playList,
      playListState.value.playList.map((item) => item.id)
    )
  }

  // 特殊逻辑：只有"我喜欢的"歌单才能开启心动模式(0)
  music.state.orderStatusVal =
    newValue === 0 && runtimeList?.specialType !== 5
      ? 1
      : (newValue as typeof music.state.orderStatusVal)

  music.getIntelliganceListHandler() // 获取心动模式推荐歌单
}

// -----------------------------------------------------------------------------
// 生命周期与暴露区 Region: Lifecycle & Expose
// -----------------------------------------------------------------------------

onMounted(() => {
  initPlayer()

  // --- 关键黑魔法：方法劫持 (Monkey Patching) ---
  // A. 备份原生方法
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
  if (player) {
    player.destroy()
    player = null
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
  transitionIsPlay,
  addListener,
  cutSongHandler
}
defineExpose(exposeObj) // 挂载到 window.$audio 上的就是这个对象
</script>

<template>
  <div class="bottom-container">
    <audio
      ref="audio"
      class="plyr-audio"
      :src="props.src"
      preload="auto"
      @timeupdate="timeupdate"
      @ended="end"
      @seeked="seeked"
      @error="audioErrorHandler"
    />
    <DetailLeft :songs="props.songs" />
    <DetailCenter
      :order-status="orderStatus"
      :is-play="isPlay"
      :order-status-val="music.state.orderStatusVal"
      @play="play"
      @pause="pause"
      @cut-song="(val) => emit('cutSong', val)"
      @set-order-handler="setOrderHandler"
    />
    <DetailRight
      :current-time="music.state.currentTime"
      :songs="props.songs"
      :audio="audio as any"
    />
  </div>
  <div class="plan-container">
    <ProgressBar :songs="props.songs" />
  </div>
</template>

<style lang="scss" scoped>
.plan-container {
  display: flex;
  align-items: center;
  height: 15px;
  position: absolute;
  top: -8.5px;
  width: 100%;
}

:deep(.el-drawer) {
  height: 100%;
}
.bottom-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 15px;
  /*
   * backdrop-filter 性能优化:
   * 1. 降低blur值从60px到40px，减少GPU采样计算
   * 2. 使用will-change提示浏览器预优化
   * 3. 使用transform开启GPU合成层
   */
  backdrop-filter: blur(40px) saturate(180%);
  will-change: backdrop-filter;
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
}
</style>
