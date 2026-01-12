<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import { useFlags } from '@/store/flags'
import { columns } from '@/components/PlayListDrawer/config'
import { useMusicAction } from '@/store/music'

const flags = useFlags()
const music = useMusicAction()
</script>

<template>
  <div :class="['drawer', { 'open-drawer': flags.isOpenDrawer }]" @click.stop>
    <div class="head">
      <div class="left">
        <span class="text">播放列表</span>
        <span class="count">{{ music.state.playQueueIds.length }}</span>
      </div>
    </div>
    <SongList
      :columns="columns as any"
      :loading="false"
      :current-song="music.state.currentSong as any"
      :ids="music.state.playQueueIds"
      :list="music.state.playQueue?.tracks || []"
      :list-info="music.state.playQueue"
      :lazy="true"
      :is-need-title="false"
      :scroll="true"
      @play="music.getMusicUrlHandler"
    />
  </div>
</template>

<style scoped lang="scss">
.drawer {
  position: fixed;
  z-index: 2001;
  height: calc(100% - 200px);
  width: 400px;
  color: #fff;
  background-color: rgba(40, 40, 40, 0.7);
  right: 0;
  top: 90px;
  border-radius: 15px 0 0 15px;
  box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.3);
  transform: translateX(120%);
  /* 优化: 仅对transform使用过渡 */
  transition: transform 0.4s ease-out;
  overflow: hidden;
  /*
   * backdrop-filter 性能优化:
   * 1. 降低blur值从60px到40px
   * 2. 使用will-change和GPU加速
   * 3. contain限制重绘范围
   */
  backdrop-filter: blur(40px) saturate(180%);
  will-change: transform, backdrop-filter;
  backface-visibility: hidden;
  contain: layout style;
  .head {
    height: 60px;
    width: 100%;
    display: flex;
    align-items: center;
    padding: 0 20px;
    //background-color: #13131a;
    .left {
      .text {
        font-size: 18px;
        color: white;
      }
      .count {
        color: $darkText;
        font-size: 14px;
        position: relative;
        left: 2px;
        top: -3px;
      }
    }
  }
  :deep(.song-list-container) {
    padding: 10px 10px;
    margin-top: 0;
    height: calc(100% - 60px);
    .list {
      justify-content: space-between !important;
      padding: 20px;
    }
  }
}
.open-drawer.drawer {
  //visibility: visible;
  transform: translateX(0%);
}
</style>
