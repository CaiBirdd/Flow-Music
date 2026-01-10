<script setup lang="ts" name="SearchList">
import SongList from '@/components/SongList/index.vue'
import { useMusicAction } from '@/store/music'
import { columns, tabsConfig } from './config'
import { useRoute, useRouter } from 'vue-router'
import { cloudSearch } from '@/api/search'
import { ref, watch } from 'vue'
import { GetMusicDetailData } from '@/api/musicList'
import AreaBox from '@/components/AreaBox/index.vue'
import Card from '@/components/Card/index.vue'

interface State {
  songs: {
    result: GetMusicDetailData[]
    songCount: number
  }
  songList: {
    playlists: any[]
    playlistCount: number
  }
}
const music = useMusicAction()
const route = useRoute()
const router = useRouter()
const limit = ref(50)
const page = ref(1)
const loading = ref(false)
const state = ref<State>({
  songs: {
    result: [],
    songCount: 0
  },
  songList: {
    playlists: [],
    playlistCount: 0
  }
})
const activeName = ref<string>(tabsConfig[0].name)

function init() {
  const { key } = route.query as { key: string }
  search(key, (page.value - 1) * limit.value, limit.value)
  getKeySongList(key, 0, 20)
}
const search = async (key: string, offset: number, limit: number) => {
  loading.value = true
  const { result } = await cloudSearch(key, offset, limit).finally(() => {
    loading.value = false
  })
  state.value.songs.songCount = result.songCount
  state.value.songs.result = result.songs
  music.updateSearchList(result.songs)
}

const currentChange = (val: number) => {
  page.value = val
  init()
}

const getKeySongList = async (key: string, offset: number, limit: number) => {
  const { result } = await cloudSearch(key, offset, limit, 1000)
  state.value.songList.playlistCount = (result as any).playlistCount
  state.value.songList.playlists = (result as any).playlists
  // console.log('result', result)
}

const gotoSongList = (item: any) => {
  router.push({
    path: '/play-list',
    query: {
      id: item.id,
      position: 1
    }
  })
}

const titleClick = () => {}

watch(
  () => route.fullPath,
  (val) => {
    if (route.path === '/search') {
      init()
    }
  },
  {
    immediate: true
  }
)
</script>

<template>
  <div class="padding-container">
    <span class="keyword"
      >{{ route.query.key }}<span class="keyword-text">的相关搜索如下</span>
    </span>
    <AreaBox @title-click="titleClick">
      <template #title>歌单</template>
      <Card
        v-for="item in state.songList.playlists"
        :key="item.id"
        :is-click="true"
        :name="item.name"
        :pic-url="item.coverImgUrl"
        @click="gotoSongList(item)"
      ></Card>
      <!--      <div @click="gotoSongList(item)" v-for="item in state.songList.playlists" class="card">-->
      <!--        <div class="img-box">-->
      <!--          <img :src="item.coverImgUrl" class="img" />-->
      <!--          <div class="count">{{ formatNumberToMillion(item.playCount) }}</div>-->
      <!--        </div>-->
      <!--        <div class="name">{{ item.name }}</div>-->
      <!--      </div>-->
    </AreaBox>

    <AreaBox :is-move="false">
      <template #title>单曲</template>
    </AreaBox>
  </div>
  <SongList
    is-loading-endflyback
    :loading="loading"
    :columns="columns"
    :current-song="music.state.currentSong"
    :list="state.songs.result"
    :list-info="{ id: 'search', name: '搜索结果' }"
    :ids="state.songs.result.map((item) => item.id)"
    is-paging
    :total="state.songs.songCount"
    :page-size="limit"
    :current-page="page"
    :is-search="false"
    @current-change="currentChange"
    @play="music.getMusicUrlHandler"
  ></SongList>
  <!-- 在搜索页的 SongList 传入 listInfo 和 ids，让搜索结果成为当前运行时列表，
   播放结束会继续按这一页（最多50首）循环/随机 -->
  <!--  <tabs v-model="activeName">-->
  <!--    <tab-pane-->
  <!--      v-for="item in tabsConfig"-->
  <!--      :name="item.name"-->
  <!--      :label="item.label"-->
  <!--    ></tab-pane>-->
  <!--  </tabs>-->
</template>

<style lang="scss" scoped>
.song-list-container {
  padding-top: 0;
  padding-left: 15px;
}
.padding-container {
  padding-bottom: 10px !important;
}
.keyword {
  color: #d2d2d2;
  font-size: 21px;
  .keyword-text {
    font-size: 14px;
    margin-left: 10px;
    color: $moreDark;
  }
}
.card {
  cursor: pointer;
  border-radius: 10px;
  position: relative;
  margin-bottom: 20px;
  .img-box {
    position: relative;
    .img {
      width: 200px;
      height: 200px;
      border-radius: 10px;
    }
    .count {
      position: absolute;
      right: 10px;
      top: 5px;
      color: white;
    }
  }

  .name {
    font-weight: 400;
    font-size: 16px;
  }
  & + & {
    margin-left: 20px;
  }
}
</style>
