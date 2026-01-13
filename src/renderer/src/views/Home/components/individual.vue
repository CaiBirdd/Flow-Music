<!-- 在首页显示“歌单/推荐”区域。 -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Recommend, recommendSongList } from '@/api/home'
import { useRouter } from 'vue-router'
import recommendImage from '@/assets/recommend.png'
import AreaBox from '@/components/AreaBox/index.vue'
import Card from '@/components/Card/index.vue'
import SkeletonCard from '@/components/SkeletonCard/index.vue'

const recommendSongs = 'recommendSongs'
const list = ref<Recommend[]>([])
const loading = ref(true)

const router = useRouter()

//这里拿到的只是首页推荐的歌单，没有每日推荐歌单，这里相当于强行凑一下
onMounted(async () => {
  const res = await recommendSongList()
  console.log(res, '首页推荐歌单')
  const { recommend } = res
  list.value = recommend
  loading.value = false
})

const playDetailList = (item: Recommend | typeof recommendSongs) => {
  if (item === recommendSongs) {
    router.push(`/daily-recommend?id=${recommendSongs}`)
  } else {
    // 普通歌单跳转通用详情页
    router.push(`/play-list?id=${(item as Recommend).id}`)
  }
}
</script>

<template>
  <div v-loading="loading" class="container">
    <SkeletonCard :loading="loading">
      <AreaBox>
        <template #title>歌单</template>
        <Card
          :is-click="true"
          name="每日歌曲推荐"
          :pic-url="recommendImage"
          @click="playDetailList(recommendSongs)"
        ></Card>
        <Card
          v-for="item in list"
          :key="item.id"
          :is-click="true"
          :name="item.name"
          :pic-url="item.picUrl"
          @click="playDetailList(item)"
        ></Card>
      </AreaBox>
    </SkeletonCard>
  </div>
</template>

<style lang="scss" scoped></style>
