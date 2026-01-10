<script setup lang="ts" name="detail">
import { useRoute, useRouter } from 'vue-router'
import UserDetailCard from '@/components/UserDetailCard/index.vue'
import { getUserDetail, Profile } from '@/api/user'
import { onUnmounted, ref, watch } from 'vue'
import { province } from 'province-city-china/data'
import UserDetailList from '@/components/UserDetailList/index.vue'
import { list } from '@/views/UserDetail/config'
import { getUserPlayList, PlaylistBase } from '@/api/musicList'
import { useUserInfo } from '@/store'
import { useTheme } from '@/store/theme'

interface State {
  userInfo: Profile
  identify: {
    level: number
  }
  playList: PlaylistBase[]
  allPlayList: PlaylistBase[]
}

const router = useRouter()
const route = useRoute()
const store = useUserInfo()
const state = ref<State>({
  userInfo: {} as Profile,
  identify: {} as {
    level: number
  },
  playList: [],
  allPlayList: []
})
const loading = ref(false)
let oldUid: number
let isFirstEnter = true
const userId = ref<number>()
const location = ref<string>('')
const activeName = ref<TabsName>(list[0].name as TabsName)
const theme = useTheme()
let timer: NodeJS.Timeout

watch(
  () => route.fullPath,
  () => {
    if (route.path === '/user-detail') {
      init()
    }
  },
  {
    immediate: true
  }
)
function init() {
  const { uid } = route.query as { uid: number | null }
  if (uid) {
    userId.value = +uid
    isFirstEnter = userId.value !== oldUid
    oldUid = +uid
    getUserDetailHandler(uid)
    getUserSongListHandler(uid)
    clearInterval(timer)
    timer = setInterval(() => {
      getUserSongListHandler(uid)
    }, 3000)
  }
}
onUnmounted(() => {
  clearInterval(timer)
})

// 获取用户详情
async function getUserDetailHandler(uid: number) {
  const { profile, level } = await getUserDetail(uid)
  state.value.userInfo = profile
  theme.change(state.value.userInfo.avatarUrl)
  state.value.identify = {
    level
  }
  location.value =
    (province.find((item) => +item.code === state.value.userInfo.province) || {}).name || '未知'
}

// 获取指定用户歌单
async function getUserSongListHandler(uid: number) {
  isFirstEnter && (loading.value = true)
  const { playlist } = await getUserPlayList(uid)
  if (isFirstEnter) {
    loading.value = false
    isFirstEnter = false
  }
  state.value.allPlayList = playlist
  state.value.playList = getCurrentTabsList(activeName.value)
}
type TabsName = 'createSongList' | 'collectSongList' | 'createSpecial'
const getCurrentTabsList = (name: TabsName) => {
  return state.value.allPlayList.filter((item) => {
    if (name === 'createSongList') {
      return userId.value === store.profile.userId ? !item.subscribed : !item.ordered
    } else if (name === 'collectSongList') {
      return userId.value === store.profile.userId ? item.subscribed : item.ordered
    }
    return false
  })
}

const tabChange = (name: TabsName) => {
  activeName.value = name
  state.value.playList = getCurrentTabsList(name)
}
</script>

<template>
  <div class="user-detail-container">
    <UserDetailCard :location="location!" :identify="state.identify" :user-info="state.userInfo" />
    <UserDetailList
      v-model="activeName"
      :play-list="state.playList"
      :list="list"
      :user-id="userId!"
      :loading="loading"
      @tab-change="tabChange"
    />
  </div>
</template>

<style lang="scss" scoped>
.user-detail-container {
}
</style>
