<!-- 歌单详情页 -->
<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import SongInfo from '@/components/SongInfo/index.vue'
import { useMusicAction } from '@/store/music'
import { columns } from '@/views/PlayList/config'
import { watch, ref } from 'vue'
import { getAlbumContent, getMusicDetail, getPlayListDetail } from '@/api/musicList'
import { useUserInfo } from '@/store'
import { useRoute } from 'vue-router'

const route = useRoute()
const music = useMusicAction()
const store = useUserInfo()
const loading = ref(false)

const loadPlaylist = async (id: number, type?: 'album' | string) => {
  loading.value = true
  try {
    let playList
    let ids: string
    if (type === 'album') {
      const res1 = await getAlbumContent(id)
      console.log(res1, '专辑')
      const { songs } = res1
      playList = songs
      ids = playList.map((item) => item.id).join(',')
    } else {
      const res2 = await getPlayListDetail(id)
      console.log(res2, '歌单')
      const { playlist } = res2
      playList = playlist
      ids = playList.trackIds.map((item) => item.id).join(',')
    }
    music.updateViewingPlaylist(playList)
    const { songs } = await getMusicDetail(ids)
    music.updateViewingPlaylist({ ...playList, tracks: songs })

    // 刷新红心
    store.refreshLikedSongs()
  } finally {
    loading.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    if (route.query.id && route.path === '/play-list') {
      loadPlaylist(+route.query.id!, route.query.type! as 'album')
      document.querySelector('.main')!.scrollTop = 0
    }
  },
  {
    immediate: true
  }
)
</script>

<template>
  <SongInfo></SongInfo>
  <SongList
    :key="String(route.query.id ?? '')"
    :columns="columns"
    :loading="loading"
    :current-song="music.state.currentSong"
    :ids="music.state.viewingPlaylist?.tracks?.map((item) => item.id) || []"
    :list="music.state.viewingPlaylist?.tracks || []"
    :list-info="music.state.viewingPlaylist"
    lazy
    @play="music.getMusicUrlHandler"
  />
</template>

<style lang="scss" scoped></style>
