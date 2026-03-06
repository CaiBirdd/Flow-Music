<script setup lang="ts" name="SearchList">
import SongList from '@/components/SongList/index.vue'
import { useMusicAction } from '@/store/music'
import { columns } from './config'
import { useRoute, useRouter } from 'vue-router'
import { cloudSearch } from '@/api/search'
import { ref, watch } from 'vue'
import { GetMusicDetailData, PlaylistBase } from '@/api/musicList' // Assuming PlaylistBase is exported here
import AreaBox from '@/components/AreaBox/index.vue'
import Card from '@/components/Card/index.vue'

// 更加语义化的状态结构
interface SearchResult {
  songs: {
    list: GetMusicDetailData[]
    total: number
  }
  playlists: {
    list: PlaylistBase[]
    total: number
  }
}
const music = useMusicAction()
const route = useRoute()
const router = useRouter()
const limit = ref(50) //分页大小
const page = ref(1) //当前页码
const loading = ref(false) //加载状态
const searchResult = ref<SearchResult>({
  songs: {
    list: [],
    total: 0
  },
  playlists: {
    list: [],
    total: 0
  }
})
//页面加载或参数变化时调用
function init() {
  const { key } = route.query as { key: string }
  getSongs(key, (page.value - 1) * limit.value, limit.value)
  getPlaylists(key, 0, 20)
}
//获取歌曲列表 offset是开始取值的起始位置，limit是取值的数量
const getSongs = async (key: string, offset: number, limit: number) => {
  loading.value = true
  const { result } = await cloudSearch(key, offset, limit).finally(() => {
    loading.value = false
  })
  searchResult.value.songs.list = result.songs
  searchResult.value.songs.total = result.songCount
  //更新store
  music.updateSearchList(result.songs)
}
//获取相关歌单
const getPlaylists = async (key: string, offset: number, limit: number) => {
  //type=1000是获取歌单
  const { result } = await cloudSearch(key, offset, limit, 1000)
  if (result) {
    searchResult.value.playlists.list = (result as any).playlists
    searchResult.value.playlists.total = (result as any).playlistCount
  }
}

//分页变化时的回调
const currentChange = (val: number) => {
  page.value = val
  init()
}
//跳转歌单详情页
const gotoSongList = (item: any) => {
  router.push({
    path: '/play-list',
    query: {
      id: item.id
    }
  })
}
// 监听路由变化
// 如果用户在当前搜索页，又在搜索框搜了新词，URL会变，这里要监听并重新 init
watch(
  () => route.fullPath,
  () => {
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
    <!-- 顶部的提示文案："xxx相关搜索如下" -->
    <span class="keyword"
      >{{ route.query.key }}<span class="keyword-text">的相关搜索如下</span>
    </span>
    <AreaBox>
      <template #title>歌单</template>
      <Card
        v-for="item in searchResult.playlists.list"
        :key="item.id"
        :is-click="true"
        :name="item.name"
        :pic-url="item.coverImgUrl"
        @click="gotoSongList(item)"
      ></Card>
    </AreaBox>
    <!-- 单曲部分，这个box只负责标题 -->
    <div class="section-title">
      单曲
      <el-icon style="position: relative; top: 1px" :size="16"><ArrowRightBold /></el-icon>
    </div>
  </div>
  <SongList
    is-loading-endflyback
    :loading="loading"
    :columns="columns"
    :current-song="music.state.currentSong"
    :list="searchResult.songs.list"
    :list-info="{ id: 'search', name: '搜索结果' }"
    :ids="searchResult.songs.list.map((item) => item.id)"
    is-paging
    :total="searchResult.songs.total"
    :page-size="limit"
    :current-page="page"
    :is-search="false"
    @current-change="currentChange"
    @play="music.getMusicUrlHandler"
  ></SongList>
  <!-- 在搜索页的 SongList 传入 listInfo 和 ids，让搜索结果成为当前运行时列表，
   播放结束会继续按这一页（最多50首）循环/随机 -->
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
.section-title {
  font-size: 18px;
  display: flex;
  align-items: center;
  margin-top: 20px;
  margin-bottom: 20px;
  cursor: pointer;

  // 保持和 AreaBox 头部一致的对齐感
  .el-icon {
    margin-left: 2px; // 给箭头一点间距
  }
}
</style>
