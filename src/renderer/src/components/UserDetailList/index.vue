<script setup lang="ts">
import { useRouter } from 'vue-router'
import { PlaylistBase } from '@/api/musicList'
import img from '@/assets/img.jpg' // 本地静态图片，作为“听歌排行”的封面
import { computed } from 'vue'
import { useUserInfo } from '@/store'
import AdaptiveListBox from '@/components/AdaptiveListBox/index.vue' // 响应式盒子容器
import AdaptiveList from '@/components/AdaptiveList/index.vue' // 响应式列表容器

//定义类型
type List = { label: string; name: string }[]

// Props 定义
interface Props {
  list: List
  modelValue: string // v-model 绑定的当前 Tab 值
  playList: PlaylistBase[] // 当前 Tab 下需要显示的歌单数据
  userId: number // 用户 ID，用于判断是否显示“听歌排行”
  loading: boolean
}
//实现v-model的双向数据绑定
const emit = defineEmits(['update:modelValue'])
const props = defineProps<Props>()
const router = useRouter()
const store = useUserInfo()

//点击歌单卡片：跳转到歌单详情页
const cardClickHandler = (item: PlaylistBase) => {
  router.push({
    path: '/play-list',
    query: {
      id: item.id
    }
  })
}
// 算属性：实现 v-model 的透传
// 这是一个经典写法：让组件内部的 val 看起来也是双向绑定的
const val = computed({
  get() {
    return props.modelValue // 读父组件的值
  },
  set(val) {
    emit('update:modelValue', val) // 写的时候通知父组件改值
  }
})
// 点击“听歌排行” 跳转UserRecord 页
const gotoUserRecord = async (uid: number) => {
  router.push({
    path: '/user-record',
    query: {
      uid
    }
  })
}
</script>

<template>
  <!-- 外层容器：自适应盒子 box -->
  <AdaptiveListBox>
    <!-- Tab 切换栏 -->
    <!-- v-model="val" 绑定的是 computed，所以修改它会自动触发 emit -->
    <v-tabs v-model="val" align-tabs="center" color="primary">
      <v-tab v-for="item in props.list" :key="item.name" :value="item.name">{{ item.label }}</v-tab>
    </v-tabs>
    <!-- 列表展示区域：带 loading 效果的容器 -->
    <AdaptiveList :loading="props.loading">
      <!-- 特殊入口：听歌排行 -->
      <card
        v-if="store.profile.userId === props.userId && val === 'createSongList'"
        :pic-url="img"
        class="item"
        name="我的听歌排行"
        is-click
        is-start-icon
        @click="gotoUserRecord(props.userId)"
      ></card>
      <!-- 歌单列表 -->
      <template v-if="playList.length">
        <card
          v-for="playItem in playList"
          :key="playItem.id"
          class="item"
          :pic-url="playItem.coverImgUrl"
          :name="playItem.name"
          is-click
          is-start-icon
          @click="cardClickHandler(playItem)"
        ></card>
      </template>
      <!-- 空状态 -->
      <div v-else>
        <h1>无任何数据</h1>
      </div>
    </AdaptiveList>
  </AdaptiveListBox>
</template>

<style lang="scss" scoped></style>
