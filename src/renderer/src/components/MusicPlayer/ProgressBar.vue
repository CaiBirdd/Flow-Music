<script setup lang="ts">
/**
 * 音乐播放进度条组件
 * - 未展开详情页：红色细线样式（1px）
 * - 展开详情页后：渐变色样式（6px），颜色从专辑封面提取
 */
import { computed } from 'vue'
import { GetMusicDetailData } from '@/api/musicList'
import { useMusicAction } from '@/store/music'
import { useFlags } from '@/store/flags'

interface Props {
  currentSong: GetMusicDetailData // 传入歌曲详情数据，主要为了获取 currentSong.dt (总时长)
}
const props = defineProps<Props>()
const music = useMusicAction() // 以获取 currentTime (当前播放时间) 和 bgColor (封面颜色)
const flags = useFlags() //获取是否打开详情页

/**
 * 进度条双向绑定值（0-100）
 * v-slider 组件需要的是 0-100 的数值，而音频播放使用的是“秒”
 * 使用 currentSong.dt（歌曲元数据时长，毫秒）替代 audio.duration
 * 原因：window.$audio.el.duration 在某些时机获取不到正确值
 */
const model = computed<number>({
  // Getter: 负责“读”，将当前秒数转换为百分比供 UI 显示
  get() {
    const duration = props.currentSong.dt // 总时长是毫秒
    if (!duration) return 0
    // currentTime（秒）转毫秒后计算百分比
    return ((music.state.currentTime * 1000) / duration) * 100
  },
  set(val) {
    // Setter: 负责“写”，当用户拖动滑块时，将百分比还原为秒数并设置播放进度
    const duration = props.currentSong.dt //总时长是毫秒
    if (!duration) return
    // 百分比转秒，设置播放位置
    // window.$audio.el.currentTime 是原生 Audio 属性  val是百分比，例如86.2
    window.$audio.el.currentTime = ((val / 100) * duration) / 1000
  }
})

// 渐变色（从专辑封面提取，默认红色）
const gradientColor0 = computed(() =>
  music.state.bgColor[0] ? `rgb(${music.state.bgColor[0]})` : 'rgb(236, 65, 65)'
)

const gradientColor1 = computed(() =>
  music.state.bgColor[1] ? `rgb(${music.state.bgColor[1]})` : 'rgb(236, 65, 65)'
)
</script>

<template>
  <div
    v-if="props.currentSong.ar"
    :class="['base-progress-bar', flags.isOpenDetail ? 'detail-progress' : 'view-progress']"
    style="width: 100%"
    :style="{
      '--gradient-color-0': gradientColor0,
      '--gradient-color-1': gradientColor1
    }"
  >
    <v-slider v-model="model"></v-slider>
  </div>
</template>

<style scoped lang="scss">
// 隐藏 Vuetify 默认的圆形滑块头 (thumb)，实现“纯线条”的极简风格
:deep(.v-slider-thumb) {
  display: none;
}

/* 未展开详情页样式：红色细线 */
.base-progress-bar.view-progress {
  height: 31px;
  // 去除输入框默认边距
  :deep(.v-input) {
    margin-inline: 0;
  }
  // 核心样式：修改滑块轨道
  :deep(.v-slider-track__fill) {
    height: 1px;
    background-color: rgb(236, 65, 65);
    border-radius: 0;
  }
}

/* 通用样式：隐藏不需要的元素 */
.base-progress-bar {
  :deep(.v-input__details) {
    display: none;
  }
  :deep(.v-slider-track__background) {
    display: none;
  }
}

/* 展开详情页样式：渐变色效果 */
.base-progress-bar.detail-progress {
  height: 30px;
  :deep(.v-slider-track__fill) {
    height: 6px;
    background-image: linear-gradient(to right, var(--gradient-color-0), var(--gradient-color-1));
    opacity: 0.8;
    border-radius: 6px;
    background-color: transparent;
  }
  :deep(.v-input) {
    margin-inline: 0;
  }
}
</style>
