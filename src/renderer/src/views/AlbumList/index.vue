<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import { useMusicAction } from '@/store/music'
import { columns } from './config'
import { watch, ref } from 'vue'
import { getAlbumContent } from '@/api/musicList'
import { useRoute } from 'vue-router'
import { getMusicDetail } from '@/api/musicList'

const route = useRoute()
const music = useMusicAction()
const loading = ref(false)

const loadAlbum = async (id: number) => {
  loading.value = true
  try {
    const res = await getAlbumContent(id)
    console.log(res, '专辑内容')
    const ids = res.songs.map((item) => item.id).join(',')
    const { songs } = await getMusicDetail(ids)
    music.updateViewingPlaylist({ id: res.album.id, tracks: songs })
  } finally {
    loading.value = false
  }
}
//处理专辑跳转专辑 就id变了其他没变的情况
watch(
  () => route.fullPath,
  () => {
    if (route.query.id && route.path === '/album-list') {
      loadAlbum(+route.query.id!)
      document.querySelector('.main')!.scrollTop = 0
    }
  },
  {
    immediate: true
  }
)
</script>

<template>
  <SongList
    :key="String(route.query.id ?? '')"
    :columns="columns"
    :loading="loading"
    :current-song="music.state.currentSong"
    :list="music.state.viewingPlaylist?.tracks || []"
    :list-info="music.state.viewingPlaylist"
    @play="music.getMusicUrlHandler"
  />
</template>

<style lang="scss" scoped></style>
