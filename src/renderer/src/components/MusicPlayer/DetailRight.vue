<script setup lang="ts">
import { formattingTime } from '@/utils'
import { GetMusicDetailData } from '@/api/musicList'
import Volume from '@/components/MusicPlayer/Volume.vue'
import { useFlags } from '@/store/flags'

interface Props {
  songs: GetMusicDetailData // 为了获取总时长 (dt)
  currentTime: number // 当前播放到了第几秒 (来自父组件的实时更新)
  audio: HTMLAudioElement // 把 audio 元素传给子组件 Volume 用
}

const props = defineProps<Props>()
const flags = useFlags()

const openDrawer = () => {
  flags.isOpenDrawer = !flags.isOpenDrawer
}
</script>

<template>
  <div class="right">
    <div style="display: flex">
      <div v-if="props.songs.ar" class="current-time">
        {{ formattingTime(props.currentTime * 1000) }}
      </div>
      <!-- 分隔符 "/" -->
      <span style="margin: 0 5px; line-height: 15px">/</span>
      <div v-if="props.songs.ar" class="total-time">{{ formattingTime(props.songs.dt) }}</div>
    </div>
    <!--使用.stop 修饰符阻止冒泡  防止点击这个按钮时误触发到底部栏的其他点击事件 -->
    <el-icon class="list" @click.stop="openDrawer"><Expand /></el-icon>
    <Volume :audio="props.audio"></Volume>
  </div>
</template>

<style scoped lang="scss">
.right {
  width: 27%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .current-time,
  .total-time {
    color: $text;
    font-size: 12px;
  }
  .list {
    font-size: 20px;
    cursor: pointer;
  }
}
</style>
