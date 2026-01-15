<script setup lang="ts" name="detail">
import { useRoute } from 'vue-router'
import UserDetailCard from '@/components/UserDetailCard/index.vue'
import { getUserDetail, Profile } from '@/api/user'
import { computed, ref, watch } from 'vue'
import { province } from 'province-city-china/data'
import UserDetailList from '@/components/UserDetailList/index.vue'
import { list } from '@/views/UserDetail/config'
import { getUserPlayList, PlaylistBase } from '@/api/musicList'
import { useUserInfo } from '@/store'
import { useTheme } from '@/store/theme'

// 定义核心数据结构
interface UserData {
  userInfo: Profile // 用户基本资料（昵称、头像等）
  identify: {
    level: number //用户等级
  }
  allPlayList: PlaylistBase[] // 该用户所有的歌单（混合了“创建”和“收藏”）
}

const route = useRoute()
const store = useUserInfo()
const userData = ref<UserData>({
  userInfo: {} as Profile,
  identify: {} as {
    level: number
  },
  allPlayList: []
})
const loading = ref(false)
const userId = ref<number>() //当前查看用户的id
const location = ref<string>('') //解析后的地理位置
type TabsName = 'createSongList' | 'collectSongList' | 'createSpecial'
const activeName = ref<TabsName>(list[0].name as TabsName)
const theme = useTheme()

// 依旧监听路由变化 如果从用户A跳到用户B（同路由不同参数），需要重新初始化
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

// 初始化逻辑
function init() {
  const { uid } = route.query as { uid: number | null }
  if (uid) {
    userId.value = +uid // 字符串转数字
    getUserDetailHandler(uid) // 获取信息
    getUserSongListHandler(uid) // 获取歌单
  }
}

// 获取用户详情
async function getUserDetailHandler(uid: number) {
  const { profile, level } = await getUserDetail(uid)
  userData.value.userInfo = profile
  theme.change(userData.value.userInfo.avatarUrl)
  userData.value.identify = {
    level
  }
  // 此时 province 是数字代码（如 330000），需要查表转成中文
  location.value =
    (province.find((item) => +item.code === userData.value.userInfo.province) || {}).name || '未知'
}

// 获取指定用户歌单
async function getUserSongListHandler(uid: number) {
  loading.value = true
  try {
    const { playlist } = await getUserPlayList(uid) //这里把所有歌单都拉了
    console.log(playlist, '所有歌单')

    userData.value.allPlayList = playlist
  } finally {
    loading.value = false
  }
}

// 使用计算属性自动过滤歌单
// 从后端拿到的 allPlayList 是混合的。
// 这里根据当前选中的 Tab (activeName) 自动过滤出“创建的”或“收藏的”。
/*
  根据后端接口来
  自己的歌单：用 subscribed 字段判断（true = 收藏，false = 创建）。
  别人的歌单：用 ordered 字段判断（true = 收藏，false = 创建）。
  ！在前面是取反，！在后面是非空
 */
const currentPlayList = computed(() => {
  const name = activeName.value
  return userData.value.allPlayList.filter((item) => {
    if (name === 'createSongList') {
      return userId.value === store.profile.userId ? !item.subscribed : !item.ordered
    } else if (name === 'collectSongList') {
      return userId.value === store.profile.userId ? item.subscribed : item.ordered
    }
    return false
  })
})
</script>

<template>
  <div class="user-detail-container">
    <UserDetailCard
      :location="location"
      :identify="userData.identify"
      :user-info="userData.userInfo"
    />
    <UserDetailList
      v-model="activeName"
      :play-list="currentPlayList"
      :list="list"
      :user-id="userId!"
      :loading="loading"
    />
  </div>
</template>

<style lang="scss" scoped>
.user-detail-container {
}
</style>
