<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Recommend, recommendSongList } from '@/api/home'
import { useRouter } from 'vue-router'
import recommendImage from '@/assets/recommend.png' // 导入本地图片：“每日推荐日历图”
import AreaBox from '@/components/AreaBox/index.vue' // 带左右箭头的横向滚动容器
import Card from '@/components/Card/index.vue' // 基础卡片组件（封面+标题)
import SkeletonCard from '@/components/SkeletonCard/index.vue' // 骨架屏组件

// 常量：每日推荐的特殊 ID，后端其实并没有这个 ID，是我们前端约定好的路由参数
const DAILY_RECOMMEND_ID = 'recommendSongs'
const recommendList = ref<Recommend[]>([]) // 存储接口返回的推荐歌单列表
const loading = ref(true) // 控制骨架屏显示的 loading 状态

const router = useRouter()

//这里拿到的只是首页推荐的歌单，没有每日推荐歌单，这里相当于强行凑一下
onMounted(async () => {
  const res = await recommendSongList()
  const { recommend } = res
  console.log(res, '首页推荐歌单')
  recommendList.value = recommend
  loading.value = false
})
// 动作：点击“每日歌曲推荐”卡片 跳转日推
const goToDailyRecommend = () => {
  router.push(`/daily-recommend?id=${DAILY_RECOMMEND_ID}`)
}
// 动作：点击普通歌单卡片，跳转通用歌单详情页
const goToPlaylist = (id: number) => {
  router.push(`/play-list?id=${id}`)
}
</script>

<template>
  <!-- 外层容器，Element Plus 的 v-loading 指令控制加载遮罩 -->
  <div v-loading="loading" class="container">
    <!-- 骨架屏组件：loading 为 true 时显示骨架，false 时显示插槽内容 -->
    <SkeletonCard :loading="loading">
      <!-- 横向滚动容器，标题是“歌单” -->
      <AreaBox>
        <template #title>歌单</template>
        <!-- 固定显示的第一个卡片：“每日歌曲推荐” -->
        <!-- 这个不是接口返回的，是写死的入口 -->
        <Card
          :is-click="true"
          name="每日歌曲推荐"
          :pic-url="recommendImage"
          @click="goToDailyRecommend"
        ></Card>
        <!-- 接口返回的推荐歌单列表 -->
        <Card
          v-for="item in recommendList"
          :key="item.id"
          :is-click="true"
          :name="item.name"
          :pic-url="item.picUrl"
          @click="goToPlaylist(item.id)"
        ></Card>
      </AreaBox>
    </SkeletonCard>
  </div>
</template>

<style lang="scss" scoped></style>
