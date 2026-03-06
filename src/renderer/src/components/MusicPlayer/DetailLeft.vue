<script setup lang="ts">
import { useFlags } from '@/store/flags'
import useMusic from '@/components/MusicPlayer/useMusic'
import { computed } from 'vue'
import { useUserInfo } from '@/store'
import { useRouter } from 'vue-router'
import { GetMusicDetailData } from '@/api/musicList' // 类型定义：确保接收到的 songs 数据格式正确

interface Props {
  currentSong: GetMusicDetailData // 接收父组件传来的“当前播放歌曲”详情对象
}

const props = defineProps<Props>()
const flags = useFlags()
const { likeMusic } = useMusic()
const store = useUserInfo()
const router = useRouter()
//动态判断当前歌曲是否“已喜欢”
const isLike = computed(() => {
  return store.userLikeIds.includes(props.currentSong.id)
})
//当前歌曲 ID 的简单包装（为了传参方便）
const id = computed(() => {
  return props.currentSong.id
})
// 动作：展开详情页
const openMusicDetail = () => {
  flags.isOpenDetail = !flags.isOpenDetail
}
// 动作：关闭详情页
const closeMusicDetail = () => {
  flags.isOpenDetail = false
}
// 动作：跳转到评论页
const gotoComment = () => {
  router.push({
    path: '/comment',
    query: {
      id: props.currentSong.id
    }
  })
  flags.isOpenDetail = false
}
</script>

<template>
  <!-- 详情页没打开的时候 -->
  <div v-show="!flags.isOpenDetail" class="left">
    <div class="picture-box" @click="openMusicDetail">
      <div
        :style="{ backgroundImage: `url(${props.currentSong.al?.picUrl + '?param=150y150'})` }"
        class="picture"
      ></div>
      <!-- 遮罩层 hover有向上展开箭头 -->
      <div class="shade-box"></div>
      <el-icon :size="25" class="close np-drag" @click="closeMusicDetail"><ArrowDown /></el-icon>
    </div>
    <!-- 信息区域：歌名 + 歌手名 -->
    <div class="name-info">
      <span class="song-name">{{ props.currentSong.name }}</span>
      <div class="name-container">
        <template v-for="(item, i) in props.currentSong.ar" :key="item.id">
          <span class="name">{{ item.name }}</span>
          <!-- 最后一个名字后面不要加斜杠 -->
          <span v-if="i === 0 && i !== props.currentSong.ar.length - 1">/</span>
        </template>
      </div>
    </div>
    <i v-if="isLike" class="iconfont icon-xihuan1" @click="likeMusic(id, false)"></i>
    <i v-else class="iconfont icon-xihuan" @click="likeMusic(id)"></i>
  </div>
  <!-- 详情页打开的时候 -->
  <div v-show="flags.isOpenDetail" class="left detail-left">
    <el-icon :size="25" class="close np-drag" @click="closeMusicDetail"><ArrowDown /></el-icon>
    <i v-if="isLike" class="iconfont icon-xihuan1" @click="likeMusic(id, false)"></i>
    <i v-else class="iconfont icon-xihuan" @click="likeMusic(id)"></i>
    <el-icon style="cursor: pointer" :size="20" @click="gotoComment"><ChatDotSquare /></el-icon>
    <div class="more">
      <el-icon :size="10"><MoreFilled /></el-icon>
    </div>
  </div>
</template>

<style scoped lang="scss">
.left {
  display: flex;
  align-items: center;
  color: $text;
  width: 25%;

  .iconfont {
    cursor: pointer;
    position: relative;
    top: -8px;
  }
  .icon-xihuan {
    color: $darkText;
    font-size: 22px;
  }
  .icon-xihuan1 {
    font-size: 21px;
    color: rgb(235, 65, 65);
  }

  .picture-box {
    position: relative;
    cursor: pointer;
    width: 50px;
    height: 50px;
    border-radius: 5px;
    overflow: hidden;
    .picture {
      @extend .bgSetting;
      width: 100%;
      height: 100%;
      transition: 0.5s;
    }
    .shade-box {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0);
      transition: 0.5s;
    }
    .close {
      /* 默认箭头是隐藏的，还是反转显示的 */
      visibility: hidden;
      position: absolute;
      top: 50%;
      left: 50%;
      transition: 0.5s;
      opacity: 0;
      transform: rotateX(-180deg) translateY(50%) translateX(-50%); /* 这里的翻转 180 度，让向下箭头变“向上箭头” */
    }
    &:hover {
      .picture {
        filter: blur(1.5px);
      }
      .shade-box {
        background-color: rgba(0, 0, 0, 0.3);
      }
      .close {
        visibility: visible;
        opacity: 1;
      }
    }
  }

  .name-info {
    font-size: 14px;
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: flex-start;

    .song-name {
      font-size: 15px;
      max-width: 140px;
      @include textOverflow();
    }

    .name-container {
      max-width: 140px;
      @include textOverflow();
    }
  }
}
.detail-left {
  .icon-xihuan1,
  .icon-xihuan {
    position: relative;
    top: 0px;
  }
  > * + * {
    margin-left: 20px;
  }
  .close {
    cursor: pointer;
  }
  .more {
    border: 0.5px solid rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    > i {
      position: relative;
      top: 0px;
    }
  }
}
</style>
