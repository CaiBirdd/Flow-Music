<script setup lang="ts">
import { useMusicAction } from '@/store/music'
import { getUserCloud, GetMusicDetailData } from '@/api/musicList'
import { columns } from './config'
import SongList from '@/components/SongList/index.vue'
import { ref } from 'vue'

const music = useMusicAction()
interface CloudData {
  loading: boolean
  ids: number[] // 当前页所有歌曲的 ID 集合
  list: GetMusicDetailData[] // 当前页的歌曲列表数据
  total: number // 总歌曲数 (用于分页计算)
  page: number // 当前页码
  limit: number // 每页显示条数 (默认 100)
}
const cloudData = ref<CloudData>({
  loading: true,
  ids: [],
  list: [],
  total: 0,
  page: 1,
  limit: 100
})

// 组件加载时，默认请求第一页数据
getCloudSongs()

async function getCloudSongs() {
  cloudData.value.loading = true
  try {
    const { data, count } = await getUserCloud(
      cloudData.value.limit,
      (cloudData.value.page - 1) * cloudData.value.limit
    )
    cloudData.value.total = count // 更新总数

    // 提取歌曲列表
    // item结构: { simpleSong: { name: '...', id: 123, ... }, ... }
    const songs = data.map((item) => item.simpleSong)
    cloudData.value.list = songs
    // 重新生成 ids，修复无限堆积 bug
    cloudData.value.ids = songs.map((item) => item.id)
  } finally {
    cloudData.value.loading = false
  }
}
// 分页切换时的回调
const handlePageChange = (val: number) => {
  cloudData.value.page = val
  getCloudSongs() // 重新请求数据
}
</script>

<template>
  <SongList
    is-loading-endflyback
    is-paging
    :current-song="music.state.currentSong"
    :columns="columns"
    :loading="cloudData.loading"
    :ids="cloudData.ids"
    :list="cloudData.list"
    :list-info="{}"
    :page-size="cloudData.limit"
    :total="cloudData.total"
    :current-page="cloudData.page"
    @play="music.getMusicUrlHandler"
    @current-change="handlePageChange"
  ></SongList>
  <!-- :list-info="{}" 歌单头部信息，云盘不需要，传个空对象 -->
</template>

<style scoped></style>
