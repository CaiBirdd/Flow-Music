<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArtistDetail, GetArtistDetailRes } from '@/api/user'
import { getArtistAlbum, GetArtistAlbumRes } from '@/api/musicList'
import AdaptiveListBox from '@/components/AdaptiveListBox/index.vue'
import AdaptiveList from '@/components/AdaptiveList/index.vue'
import { tabsConfig } from '@/views/SingerPage/config'
import { useTheme } from '@/store/theme'
// 数据接口定义
// 整合了歌手详情 (detail)、歌手基础信息 (artist) 和热门专辑 (albums)
interface SingerData {
  detail: GetArtistDetailRes['data']
  artist: GetArtistDetailRes['data']['artist']
  albums: GetArtistAlbumRes['hotAlbums']
}

const singerData = ref<SingerData>({
  detail: {} as GetArtistDetailRes['data'],
  artist: {} as GetArtistDetailRes['data']['artist'],
  albums: []
})
const route = useRoute()
const router = useRouter()
const theme = useTheme()

// Tab 配置  ('1'='专辑', '2'='MV', 等)
type LabelType = '1' | '2' | '3' | '4'
const activeTab = ref<LabelType>(tabsConfig[0].name as LabelType) //默认选中第一个专辑
//依旧监听路由 如果歌手变了重新初始化
watch(
  () => route.fullPath,
  () => {
    if (route.path === '/singer-page') {
      init()
    }
  },
  {
    immediate: true
  }
)
//初始化函数
function init() {
  //获取歌手id
  const { id } = route.query as { id: number | null }
  if (id) {
    getSingerDetail(id) // 获取歌手详情
    getSingerAlbum(id) // 获取专辑列表
  }
}

async function getSingerDetail(id: number) {
  const res = await getArtistDetail(id)
  console.log(res, '歌手信息')
  const { data } = res
  singerData.value.detail = data
  singerData.value.artist = data.artist
  theme.change(singerData.value.artist.avatar)
}

//获取歌手热门专辑
async function getSingerAlbum(id: number) {
  const { hotAlbums } = await getArtistAlbum(id)
  singerData.value.albums = hotAlbums
}
// 计算属性：作者别名
const alias = computed(() => {
  return singerData.value.artist.alias?.join('；')
})

// 跳转到歌手的个人主页（如果有）
const gotoUserDetail = () => {
  router.push({
    path: '/user-detail',
    query: {
      uid: singerData.value.detail.user!.userId
    }
  })
}
// 跳转到专辑内页
const goToAlbum = async (id: number) => {
  router.push({
    path: '/album-list',
    query: {
      id
    }
  })
}
</script>

<template>
  <div class="singer-card-container">
    <!-- 头像 -->
    <div :style="{ backgroundImage: `url(${singerData.artist.avatar})` }" class="avatar"></div>
    <div class="detail">
      <!-- 歌手名+别名 -->
      <h2 class="name">{{ singerData.artist.name }}</h2>
      <div class="alias">{{ alias }}</div>
      <div class="btn">
        <v-btn variant="tonal" rounded="lg">已收藏</v-btn>
        <v-btn v-if="singerData.detail.user" variant="tonal" rounded="lg" @click="gotoUserDetail"
          >个人主页</v-btn
        >
      </div>
      <div class="count">
        <span v-if="singerData.artist.musicSize">单曲数:{{ singerData.artist.musicSize }}</span>
        <span v-if="singerData.artist.albumSize">专辑数:{{ singerData.artist.albumSize }}</span>
        <span v-if="singerData.artist.mvSize">MV数:{{ singerData.artist.mvSize }}</span>
      </div>
    </div>
  </div>
  <!-- 下方列表容器：AdaptiveListBox 用于自适应布局 -->
  <adaptive-list-box>
    <!-- Tab 切换器 -->
    <tabs v-model="activeTab">
      <tab-pane
        v-for="(item, index) in tabsConfig"
        :key="index"
        :name="item.name"
        :label="item.label"
      >
        <!-- 列表容器 -->
        <adaptive-list :loading="false">
          <!-- 这里用v-if是因为除了专辑其他是空的,要不然都会渲染成专辑 -->
          <template v-if="item.name === '1'">
            <card
              v-for="albumItem in singerData.albums"
              :key="albumItem.id"
              :name="albumItem.name"
              :pic-url="albumItem.picUrl"
              is-click
              is-start-icon
              @click="goToAlbum(albumItem.id)"
            ></card>
          </template>
        </adaptive-list>
      </tab-pane>
    </tabs>
  </adaptive-list-box>
</template>

<style lang="scss" scoped>
.singer-card-container {
  display: flex;
  background-color: rgba(255, 255, 255, 0.05); // 半透明背景
  padding: 20px;
  border-radius: 20px;
  width: calc(87vw - 180px); // 宽度计算：屏幕宽度的 87% 减去 180px
  margin: 0 auto;
  box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.1); // 阴影
  transition: 0.4s;
  @extend .bgSetting;
  .avatar {
    @extend .bgSetting;
    height: 200px;
    width: 200px;
    border-radius: 10px;
    margin-right: 30px;
  }
  .detail {
    display: flex;
    flex-direction: column;
    .btn {
      display: flex;
      gap: 10px; // 按钮间距
    }
    > * {
      margin-bottom: 10px; // 让 detail 下所有直接子元素底部都有间距
    }
    .alias {
      font-size: 14px;
    }
    .count {
      > * {
        font-size: 13px;
        margin-right: 20px; // 统计项间距
      }
    }
  }
}
</style>
