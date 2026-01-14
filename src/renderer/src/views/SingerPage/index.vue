<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArtistDetail, GetArtistDetailRes } from '@/api/user'
import { getArtistAlbum, GetArtistAlbumRes } from '@/api/musicList'
import AdaptiveListBox from '@/components/AdaptiveListBox/index.vue'
import AdaptiveList from '@/components/AdaptiveList/index.vue'
import { tabsConfig } from '@/views/SingerPage/config'
import { useTheme } from '@/store/theme'

interface State {
  singerDetail: GetArtistDetailRes['data']
  artist: GetArtistDetailRes['data']['artist']
  albums: GetArtistAlbumRes['hotAlbums']
}
const state = ref<State>({
  singerDetail: {} as GetArtistDetailRes['data'],
  artist: {} as GetArtistDetailRes['data']['artist'],
  albums: []
})
// 修改为string类型，tab-pane的name属性可接受string类型
type LabelType = '1' | '2' | '3' | '4'
const activeTab = ref<LabelType>(tabsConfig[0].name as LabelType)
const route = useRoute()
const router = useRouter()
const theme = useTheme()
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

function init() {
  const { id } = route.query as { id: number | null }
  if (id) {
    getSingerDetail(id)
    getSingerAlbum(id)
  }
}

async function getSingerDetail(id: number) {
  const { data } = await getArtistDetail(id)

  state.value.singerDetail = data
  state.value.artist = data.artist
  theme.change(state.value.artist.avatar)
}
async function getSingerAlbum(id: number) {
  const { hotAlbums } = await getArtistAlbum(id)
  state.value.albums = hotAlbums
}
const alias = computed(() => {
  return state.value.artist.alias?.join('；')
})

const gotoUserDetail = () => {
  router.push({
    path: '/user-detail',
    query: {
      uid: state.value.singerDetail.user!.userId
    }
  })
}
const getAlbumContentHandler = async (id: number) => {
  // const data = await getAlbumContent(id)
  // console.log(data)
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
    <div :style="{ backgroundImage: `url(${state.artist.avatar})` }" class="avatar"></div>
    <div class="detail">
      <h2 class="name">{{ state.artist.name }}</h2>
      <div class="alias">{{ alias }}</div>
      <div class="btn">
        <v-btn variant="tonal" rounded="lg">已收藏</v-btn>
        <v-btn v-if="state.singerDetail.user" variant="tonal" rounded="lg" @click="gotoUserDetail"
          >个人主页</v-btn
        >
      </div>
      <div class="count">
        <span v-if="state.artist.musicSize">单曲数:{{ state.artist.musicSize }}</span>
        <span v-if="state.artist.albumSize">专辑数:{{ state.artist.albumSize }}</span>
        <span v-if="state.artist.mvSize">MV数:{{ state.artist.mvSize }}</span>
      </div>
    </div>
  </div>
  <adaptive-list-box>
    <tabs v-model="activeTab">
      <tab-pane
        v-for="(item, index) in tabsConfig"
        :key="index"
        :name="item.name"
        :label="item.label"
      >
        <!-- adaptive-list 组件需要 loading 属性，设置为false表示不加载 -->
        <adaptive-list :loading="false">
          <!-- 原代码: v-for="item in state.albums" -->
          <!-- 改为albumItem以不与上层作用域的item変量重合 -->
          <card
            v-for="albumItem in state.albums"
            :key="albumItem.id"
            :name="albumItem.name"
            :pic-url="albumItem.picUrl"
            is-click
            is-start-icon
            @click="getAlbumContentHandler(albumItem.id)"
          ></card>
        </adaptive-list>
      </tab-pane>
    </tabs>
  </adaptive-list-box>
</template>

<style lang="scss" scoped>
.singer-card-container {
  display: flex;
  //align-items: center;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 20px;
  width: calc(87vw - 180px);
  //width: 87%;
  margin: 0 auto;
  box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.1);
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
    //justify-content: flex-start;
    .btn {
      display: flex;
      gap: 10px;
    }
    > * {
      margin-bottom: 10px;
    }
    .alias {
      font-size: 14px;
    }
    .count {
      > * {
        font-size: 13px;
        margin-right: 20px;
      }
    }
  }
}
</style>
