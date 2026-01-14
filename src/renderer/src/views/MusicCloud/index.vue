<script setup lang="ts">
import { useMusicAction } from '@/store/music'
import { getUserCloud, GetMusicDetailData, PlaylistBase } from '@/api/musicList'
import { columns } from './config'
import SongList from '@/components/SongList/index.vue'
import { ref } from 'vue'

const music = useMusicAction()
// GetUserCloudRes['data']
interface State {
  loading: boolean
  ids: number[]
  list: GetMusicDetailData[]
  listInfo: PlaylistBase | object
  total: number
  page: number
  limit: number
}
const state = ref<State>({
  loading: true,
  ids: [],
  list: [],
  listInfo: {},
  total: 0,
  page: 1,
  limit: 100
})

getUserCloudFn()

async function getUserCloudFn() {
  state.value.loading = true
  const { data, count } = await getUserCloud(
    state.value.limit,
    (state.value.page - 1) * state.value.limit
  ).finally(() => {
    state.value.loading = false
  })
  state.value.total = count
  state.value.list = data.map((item) => {
    state.value.ids.push(item.simpleSong.id)
    return item.simpleSong
  })
  music.updateViewingPlaylist({ id: 'cloud-songs', tracks: state.value.list })
}

const currentChange = (val: number) => {
  state.value.page = val
  getUserCloudFn()
}
</script>

<template>
  <SongList
    is-loading-endflyback
    is-paging
    :current-song="music.state.currentSong"
    :columns="columns"
    :loading="state.loading"
    :ids="state.ids"
    :list="state.list"
    :list-info="state.listInfo"
    :page-size="state.limit"
    :total="state.total"
    :current-page="state.page"
    @play="music.getMusicUrlHandler"
    @current-change="currentChange"
  ></SongList>
</template>

<style scoped></style>
