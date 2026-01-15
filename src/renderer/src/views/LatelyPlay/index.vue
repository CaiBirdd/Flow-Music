<script setup lang="ts">
import SongList from '@/components/SongList/index.vue'
import { columns } from './config'

import { useMusicAction } from '@/store/music'
import { getRecordSong, GetMusicDetailData } from '@/api/musicList'
import { useUserInfo } from '@/store'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'

const music = useMusicAction()
const store = useUserInfo()

const loading = ref(false)
const recentSongs = ref<GetMusicDetailData[]>([])
const ids = ref<number[]>([])

const getRecentSongs = async () => {
  try {
    loading.value = true
    await store.refreshLikedSongs()
    const { data } = await getRecordSong()

    // 格式化成songList组件能够接受的数据格式
    const list = data.list.map((item) => {
      return {
        ...item,
        ...item.data
      }
    })
    recentSongs.value = list
    ids.value = list.map((item) => item.id)
  } catch (e) {
    ElMessage.error(`获取最近歌曲失败: ${e}`)
  } finally {
    loading.value = false
  }
}

const init = async () => {
  getRecentSongs()
}

init()
</script>

<template>
  <div class="record-song">
    <h2>保存了近300首的播放记录</h2>
  </div>
  <SongList
    :columns="columns"
    :loading="loading"
    :current-song="music.state.currentSong"
    :list="recentSongs"
    :list-info="{}"
    :ids="ids"
    @play="music.getMusicUrlHandler"
  />
</template>

<style lang="scss" scoped>
.record-song {
  padding: 0 35px;
}
</style>
