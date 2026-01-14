<!-- 显示当前歌单的信息卡片，
 包括封面背景、播放量、名称、作者、创建时间、简介和若干操作按钮（播放全部、收藏、下载全部） -->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { formatDate, formatNumberToMillion, toggleImg } from '@/utils'
import { useMusicAction } from '@/store/music'
import { watch, useTemplateRef } from 'vue'
import { useTheme } from '@/store/theme'

const music = useMusicAction()
const left = useTemplateRef<HTMLDivElement>('left')
const theme = useTheme()
const router = useRouter()

//监听歌单封面图的变化，动态设置背景色
watch(
  () => music.state.viewingPlaylist?.coverImgUrl,
  (val) => {
    if (val) {
      toggleImg(val, '350y350').then((img) => {
        if (left.value) {
          //设置歌单封面
          left.value.style.backgroundImage = `url(${img.src})`
        }
      })
      //设置背景色
      theme.change(val)
    }
  },
  {
    immediate: true // 立即执行一次：防止进入页面时已经有数据但没触发监听
  }
)
// 跳转到用户详情页
const gotoUserDetail = () => {
  router.push({
    path: '/user-detail',
    query: {
      uid: music.state.viewingPlaylist?.userId
    }
  })
}
</script>

<template>
  <!-- v-if: 如果没有封面图（说明数据还没加载好），整个头部都不显示 -->
  <div v-if="music.state.viewingPlaylist?.coverImgUrl" class="list-info">
    <div>
      <div ref="left" class="left">
        <span class="count">
          {{ formatNumberToMillion(music.state.viewingPlaylist?.playCount || 0) }}
        </span>
      </div>
    </div>

    <div class="right">
      <div class="song-name">
        <div class="tag">歌单</div>
        <div class="name">{{ music.state.viewingPlaylist?.name }}</div>
      </div>
      <div class="song-info">
        <div
          :style="{ backgroundImage: `url(${music.state.viewingPlaylist?.creator?.avatarUrl})` }"
          class="avatar"
        ></div>
        <div class="nickname" @click="gotoUserDetail">
          {{ music.state.viewingPlaylist?.creator?.nickname }}
        </div>
        <div class="create-timer">
          {{ formatDate(music.state.viewingPlaylist?.createTime || 0, 'YY-MM-DD hh:mm:ss') }}创建
        </div>
      </div>
      <span v-if="(music.state.viewingPlaylist as any)?.description" class="text-info-desc">
        {{ (music.state.viewingPlaylist as any)?.description }}
      </span>

      <div class="song-handle">
        <v-btn variant="tonal" rounded="lg">播放全部</v-btn>
        <v-btn variant="tonal" rounded="lg">收藏</v-btn>
        <v-btn variant="tonal" rounded="lg">下载全部</v-btn>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.list-info {
  display: flex;
  padding: 0 35px;

  .left {
    @extend .bgSetting;
    width: 220px;
    height: 220px;
    border-radius: 10px;
    position: relative;
    .count {
      color: white;
      position: absolute;
      right: 10px;
      top: 8px;
      font-size: 15px;
    }
  }
  .text-info-desc {
    font-size: 12px;
    margin-bottom: 5px;
    @include textOverflow(2);
  }
  .right {
    margin-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    > div {
      display: flex;
      align-items: center;
      color: $text;
    }

    .song-name {
      .name {
        color: white;
        font-size: 25px;
        margin-left: 10px;
      }
      .tag {
        font-size: 13px;
        border-radius: 3px;
        padding: 0 5px;
        color: $subject;
        border: 1px solid $subject;
        & + & {
          margin-left: 5px; // 如果有多个 tag，之间加间距
        }
      }
    }
    .song-info {
      font-size: 12px;
      * + * {
        margin-left: 8px; // 相邻兄弟选择器：给除了第一个元素外的所有子元素加左边距
      }
      .avatar {
        border-radius: 50%;
        width: 25px;
        height: 25px;
        @extend .bgSetting;
        cursor: pointer;
      }
      .nickname {
        color: rgb(133, 185, 230);
        cursor: pointer;
        &:hover {
          color: rgb(150, 200, 230);
        }
      }
      .create-timer {
        color: $darkText;
      }
    }
    .song-handle {
      display: flex;
      gap: 10px;
      font-size: 14px;
    }
    .song-count {
      font-size: 13px;
      .p1 {
        margin-right: 13px;
      }
      > div {
        > span {
          color: $darkText;
        }
        > :first-child {
          color: $text;
        }
      }
    }
  }
}
</style>
