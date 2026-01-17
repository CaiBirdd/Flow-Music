<!-- 每日推荐歌单 和其他歌单作区分 -->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ref } from 'vue'
import { useMusicAction } from '@/store/music'
import { varDayim } from '@/utils'
import SongInfo from '@/components/SongInfo/index.vue'
import SongList from '@/components/SongList/index.vue'
import { columns } from '@/views/PlayList/config'
import { recommendSong } from '@/api/home'
import { playListMock } from '@/views/DailyRecommend/dailyRecommendSongsConfig'
import { useUserInfo } from '@/store'

const route = useRoute()
const music = useMusicAction()
const store = useUserInfo()
const loading = ref(false)

const init = () => {
  const { id } = route.query as { id: number | 'recommendSongs' | null }
  // 是否是每日推荐歌曲
  if (id === 'recommendSongs') {
    getRecommendSongs()
  } else {
    // 日推组件如果被路由到普通歌单ID(理论上不会，但保留防御)，这里可以留空或跳转
    // 目前没有loadPlaylist了，如果真的有这种情况，应该让它跳转到 PlayList 视图。
    // 假设 DailyRecommend 只处理日推，忽略此分支。
  }
}
const getRecommendSongs = async () => {
  const { data } = await recommendSong()
  playListMock.tracks = data.dailySongs
  // 更新 store，并获取红心列表
  music.updateViewingPlaylist(playListMock)
  store.refreshLikedSongs()
  return data
}
init()
</script>

<template>
  <SongInfo v-if="route.query.id !== 'recommendSongs'"></SongInfo>
  <div v-else class="padding-container">
    <div class="top">
      <div class="day">
        <div class="row-left row"></div>
        <div class="row-right row"></div>
        <div class="line"></div>
        <div class="text">{{ varDayim() }}</div>
      </div>
      <div class="text-info">
        <div class="text-info-title">每日歌曲推荐</div>
        <div class="text-info-desc">根据您的音乐口味生成, 每天6:00更新</div>
      </div>
    </div>
    <div class="bottom">
      <v-btn
        class="custom-btn subject-btn"
        rounded="lg"
        prepend-icon="mdi-play-circle-outline"
        variant="flat"
        height="44"
      >
        播放全部
      </v-btn>
      <v-btn
        class="custom-btn default-btn"
        rounded="lg"
        prepend-icon="mdi-folder-plus-outline"
        variant="outlined"
        height="44"
      >
        收藏全部
      </v-btn>
    </div>
  </div>
  <SongList
    :columns="columns"
    :loading="loading"
    :current-song="music.state.currentSong"
    :ids="music.state.viewingPlaylist?.tracks?.map((item) => item.id) || []"
    :list="music.state.viewingPlaylist?.tracks || []"
    :list-info="music.state.viewingPlaylist"
    @play="music.getMusicUrlHandler"
  />
</template>

<style lang="scss" scoped>
.padding-container {
  display: flex;
  flex-direction: column;
  align-items: start;
  .top {
    display: flex;
    align-items: center;
    .day {
      border: 3px solid $subject;
      width: 80px;
      height: 70px;
      border-radius: 15px;
      padding: 0 8px;
      position: relative;
      .row-left {
        left: 20px;
      }
      .row-right {
        right: 20px;
      }
      .row {
        position: absolute;
        top: -8px;
        height: 13px;
        width: 3px;
        background-color: $subject;
        border-radius: 2px;
      }
      .line {
        position: relative;
        top: 10px;
        border-radius: 2px;
        height: 3px;
        width: 100%;
        background-color: $subject;
        margin-bottom: 5px;
      }
      .text {
        font-size: 40px;
        font-weight: 800;
        color: $subject;
        text-align: center;
      }
    }
    .text-info {
      margin-left: 30px;
      text-align: left;
      .text-info-title {
        font-size: 25px;
      }
      .text-info-desc {
        margin-top: 5px;
        font-size: 12px;
        color: $darkText;
      }
    }
  }

  .bottom {
    margin-top: 20px;

    .custom-btn {
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 0.5px;

      & + .custom-btn {
        margin-left: 12px;
      }
    }

    .subject-btn {
      background-image: linear-gradient(rgb(255, 17, 104), rgb(252, 61, 73));
      color: white;
      transition: opacity 0.2s;

      &:hover {
        opacity: 0.9;
      }
    }

    .default-btn {
      border-color: rgba(255, 255, 255, 0.15);
      color: white;
      background-color: rgba(255, 255, 255, 0.05);

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
      }
    }
  }
}
</style>
