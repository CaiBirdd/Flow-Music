<script setup lang="ts">
import { useMusicAction } from '@/store/music'
import LyricDisplay from './LyricDisplay.vue'
import FlowBg from './FlowBg.vue'

import { useFlags } from '@/store/flags'

const flags = useFlags()
const music = useMusicAction()

// 从 store 中获取当前歌曲的封面图，传给 FlowBg 和 LyricDisplay
// 这样两个子组件就能拿到同一张图：一个做模糊背景，一个做歌曲封面展示

//关闭详情页
const closeDetail = () => {
  flags.isOpenDetail = false
}

// 优化：移除 JS 高度计算，改用 CSS 百分比布局，避免 resize 事件监听开销
// const correctHeight = ref<number>(0)
// onMounted(() => { ... })
</script>

<template>
  <div :class="['container', { open: flags.isOpenDetail }]">
    <el-icon :size="45" class="close np-drag" @click="closeDetail"><ArrowDown /></el-icon>
    <!-- 优化：直接使用 CSS 100% 高度 -->
    <div class="box">
      <!-- 优化：直接使用 CSS 200% 高度 (100% 显示区域 + 100% 歌词区域) -->
      <div class="scroll-box">
        <FlowBg :bg="music.state.currentSong?.al?.picUrl" />
        <div class="music-detail-container">
          <LyricDisplay
            :lyric="music.state.lyric"
            :bg="music.state.currentSong?.al?.picUrl"
            :title="music.state.currentSong.name"
            :ar="music.state.currentSong.ar"
            :video-play-url="music.state.videoPlayUrl"
          />
          <div class="music-detail-bottom"></div>
          <!-- 底部占位符 给底部的播放控制栏留出 80px 的安全距离，防止歌词滚到底部被遮挡。 -->
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.container {
  visibility: hidden; //默认不可见
  position: fixed; // 固定定位，使其相对于浏览器窗口定位，覆盖在所有页面内容之上
  height: 100%; // 高度和宽度占满整个视口高度
  width: 100%;
  bottom: 0; // 底部对齐，配合 transform 使用
  left: 0;
  transition: 0.4s; // 过渡动画时长 0.4s，用于控制打开/关闭时的滑入滑出速度
  z-index: 2000; /* 保证层级高 */
  overflow: hidden; // 隐藏溢出的内容，防止内部元素动效导致出现滚动条
  transform: translateY(100%); /*默认藏在屏幕最底下 */

  .box {
    overflow: hidden;
    width: 100%;
    height: 100%; // 优化：使用 CSS 控制高度
    .scroll-box {
      height: 200%; // 优化：高度设为容器的 2 倍
      position: relative;
      overflow: hidden;
      background-color: $bgColor;

      // 使用 fixed 避免容器滑动时背景被缩放
      .music-detail-container {
        position: fixed;
        height: 100%;
        width: 100%;
        @extend .bgSetting;

        .music-detail-bottom {
          height: 80px;
          position: absolute;
          bottom: 0;
          width: 100%;
        }
      }
    }
  }
  .close {
    z-index: 1;
    position: absolute;
    top: 12px;
    left: 15px;
    padding: 10px;
    font-size: 20px;
    cursor: pointer;
  }
  &.open {
    transform: translateY(0) !important;
    visibility: visible;
    .box {
      .scroll-box {
        // 打开时让歌词底部过渡出安全区背景
        .music-detail-container {
          //给底部播放组件加个淡淡的背景，要不然太深了颜色看不清
          .music-detail-bottom {
            background-color: rgba(255, 255, 255, 0.05);
          }
        }
      }
    }
  }
}
</style>
