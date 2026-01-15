<script lang="ts" setup>
import { computed, ref } from 'vue'
import { getUserRecord } from '@/api/musicList'
import { useRoute } from 'vue-router'
import { ElNotification } from 'element-plus'
import SongList from '@/components/SongList/index.vue'
import { columns } from './config'
import { useMusicAction } from '@/store/music'

// tab: 控制当前显示的是 'recent'(一周) 还是 'history'(所有时间)
const tab = ref('recent')
const loading = ref(true)
const recordData = ref({
  recent: [] as any[], // 最近一周的数据
  history: [] as any[] // 所有时间的数据
})
// 存储歌曲 ID 列表，用于播放整个列表时的逻辑
const recentIds = ref<any[]>([])
const historyIds = ref<any[]>([])

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

// 计算当前激活的列表数据 这样模板里只需要写一个 <SongList> 组件，不用写两个 v-show 了
const currentList = computed(() => {
  return tab.value === 'recent' ? recordData.value.recent : recordData.value.history
})
const currentIds = computed(() => {
  return tab.value === 'recent' ? recentIds.value : historyIds.value
})
// 获取听歌记录
// type: 1=最近一周，0=所有时间
const fetchUserRecord = async (type: number) => {
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
  // 映射后端返回的字段名：type=1是weekData，type=0是allData
  const key = type === 1 ? 'weekData' : 'allData'
  const uid = Number(route.query.uid)
  // 发起请求
  //这有点意思 如果返回的数据是res，这里直接通过解构拿到，比如weekData是键名，[]取它的值，并赋值给allData
  const { [key]: allData } = await getUserRecord(uid, type)
  if (!allData) return
  console.log(allData, '最近一周和所有时间')

  // 数据处理：后端返回的数据结构比较深，需要把 .song 里的属性解构出来
  const data = allData.map((item) => ({
    ...item,
    ...item.song // 展平 song 对象，方便 table 展示
  }))
  // 分类存储
  if (type === 0) {
    recordData.value.history = data
    historyIds.value = data.map((item) => item.id)
  } else {
    recordData.value.recent = data
    recentIds.value = data.map((item) => item.id)
  }
  // 同步到播放器 Store，这样在页面里点播放时，播放器知道当前的上下文列表
  music.updateViewingPlaylist({ id: 'userRecord', tracks: data })
}
// 初始化
async function init() {
  loading.value = true
  try {
    // 1 代表最近一周，0 代表所有时间 注意这里并行两个请求
    await Promise.all([fetchUserRecord(1), fetchUserRecord(0)])
  } finally {
    loading.value = false
  }
}
init()
</script>

<template>
  <!-- 头部 Tabs 栏 -->
  <div style="padding-bottom: 0" class="padding-container">
    <!-- Vuetify Tabs 组件  双向绑定当前选中的 tab 值 ('recent' 或 'history')-->
    <v-tabs v-model="tab" align-tabs="start" color="primary">
      <v-tab v-for="item in tabs" :key="item.value" :value="item.value">{{ item.label }}</v-tab>
    </v-tabs>
  </div>

  <!-- 合并后的 SongList -->
  <div>
    <SongList
      :columns="columns"
      :loading="loading"
      :current-song="music.state.currentSong"
      :ids="currentIds"
      :list="currentList"
      :is-need-title="false"
      @play="music.getMusicUrlHandler"
    />
  </div>
</template>

<style lang="scss"></style>
