<script lang="ts" setup>
import { ref } from 'vue'
import { getUserRecord } from '@/api/musicList'
import { useRoute } from 'vue-router'
import { ElNotification } from 'element-plus'
import SongList from '@/components/SongList/index.vue'
import { columns } from './config'
import { useMusicAction } from '@/store/music'

const tab = ref()
const loading = ref(true)
const state = ref({
  recent: [] as any[],
  history: [] as any[]
})
const recentIds = ref([])
const historyIds = ref([])
const route = useRoute()
const music = useMusicAction()
const tabs = [
  {
    value: 'recent',
    label: '最近一周'
  },
  {
    value: 'history',
    label: '所有时间'
  }
]

const getUserRecordHandler = async (type: number) => {
  if (!route.query.uid) {
    ElNotification({
      title: '错误',
      message: '缺少uid参数，尝试刷新页面或重新载入此页面',
      type: 'error',
      offset: 80,
      duration: 0
    })
    return
  }

  const key = type === 1 ? 'weekData' : 'allData'

  const uid = Number(route.query.uid)
  const { [key]: allData } = await getUserRecord(uid, type)
  if (!allData) {
    return
  }
  const data = allData.map((item) => ({
    ...item,
    ...item.song
  }))
  if (type === 0) {
    state.value.history = data
    historyIds.value = data.map((item) => item.id)
  } else {
    state.value.recent = data
    recentIds.value = data.map((item) => item.id)
  }
  music.updateViewingPlaylist({ id: 'userCover', tracks: data })
}

async function init() {
  loading.value = true
  await getUserRecordHandler(1)
  await getUserRecordHandler(0)
  loading.value = false
}
init()
</script>

<template>
  <div style="padding-bottom: 0" class="padding-container">
    <v-tabs v-model="tab" align-tabs="start" color="primary">
      <v-tab v-for="item in tabs" :key="item.value" :value="item.value">{{ item.label }}</v-tab>
    </v-tabs>
  </div>

  <div v-show="tab === 'recent'">
    <SongList
      :columns="columns"
      :loading="loading"
      :current-song="music.state.currentSong"
      :ids="recentIds"
      :list="state.recent"
      :is-need-title="false"
      lazy
      @play="music.getMusicUrlHandler"
    />
  </div>
  <div v-show="tab === 'history'">
    <SongList
      :columns="columns"
      :loading="loading"
      :current-song="music.state.currentSong"
      :ids="historyIds"
      :list="state.history"
      :is-need-title="false"
      lazy
      @play="music.getMusicUrlHandler"
    />
  </div>
</template>

<style lang="scss"></style>
