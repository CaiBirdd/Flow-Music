<!-- 歌单详情页 -->
<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import SongInfo from '@/components/SongInfo/index.vue'
import { useMusicAction } from '@/store/music'
import { columns } from '@/views/PlayList/config'
import { watch, ref } from 'vue'
import { getPlayListDetail } from '@/api/musicList'
import { useUserInfo } from '@/store'
import { useRoute } from 'vue-router'

const route = useRoute()
const music = useMusicAction()
const store = useUserInfo()
const loading = ref(false)

// 核心加载函数：根据 ID 加载歌单数据
const loadPlaylist = async (id: number) => {
  loading.value = true
  try {
    //歌单分支
    const res = await getPlayListDetail(id)
    console.log(res, '歌单')
    const { playlist } = res
    music.updateViewingPlaylist({ ...playlist, tracks: playlist.tracks })
    // 刷新红心
    store.refreshLikedSongs()
  } finally {
    loading.value = false
  }
}
//处理歌单跳转歌单 就id变了其他没变的情况
watch(
  () => route.fullPath,
  () => {
    if (route.query.id && route.path === '/play-list') {
      loadPlaylist(+route.query.id!)
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
    @play="music.getMusicUrlHandler"
  />
</template>

<style lang="scss" scoped></style>
