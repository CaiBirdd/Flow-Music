<!-- 功能：渲染歌曲列表页（可搜索、播放、分页、右键菜单、显示专辑/歌手信息等）
 是歌曲列表展示与播放交互的主视图组件。 -->
<script setup lang="ts">
import { h, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { lookup } from '@/utils'
import { GetMusicDetailData, PlaylistBase } from '@/api/musicList'
import { useUserInfo } from '@/store'
import useMusic from '@/components/MusicPlayer/useMusic'
import { useMusicAction } from '@/store/music'
import Pagination from '@/components/Pagination/index.vue'
import NotFound from '@/assets/not-found.png'
import ContextMenu from '@/components/ContextMenu/index.vue'
import { checkMusic } from '@/api/play'

export interface Columns {
  title: string
  hidden?: boolean
  picUrl?: string
  icon?: string[]
  prop?: string
  on?: object
  style?: object
  width?: string
  type?: 'index' | 'handle' | 'title' | 'album'
  class?: string
  processEl?: (createVNode: typeof h, arg: any, index: number) => any
  lazy?: boolean
}

const playlistMenuItems = [
  { label: '收藏歌曲', value: 'collection' },
  { label: '评论', value: 'comment' },
  { label: '删除歌曲', value: 'delete' }
]
interface Props {
  list: GetMusicDetailData[]
  currentSong: GetMusicDetailData
  columns: Columns[]
  loading?: boolean
  ids?: number[]
  listInfo?: PlaylistBase | any
  scroll?: boolean
  isPaging?: boolean
  total?: number
  pageSize?: number
  currentPage?: number
  isLoadingEndflyback?: boolean
  lazy?: boolean
  isNeedTitle?: boolean
  isSearch?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  listInfo: {},
  isSearch: true,
  isPaging: true,
  pageSize: 50,
  currentPage: 1,
  isLoadingEndflyback: false,
  lazy: true,
  isNeedTitle: true
})
const emit = defineEmits(['play', 'current-change', 'update:modelValue'])

const store = useUserInfo()
const music = useMusicAction()
const { likeMusic, deleteSongHandler } = useMusic()
const router = useRouter()
const route = useRoute()

const id = ref(0)
const filterList = ref(props.list)
const copyrightVisible = ref(false)
const searchKeyword = ref('')

const formatCount = (index: number) => {
  return index.toString().length > 1 ? index : '0' + index
}

const handlePlaylistMenuSelect = (item: { label: string; value: string }, row) => {
  switch (item.value) {
    case 'collection':
      break
    case 'delete':
      deleteSongHandler(row.id, props.listInfo.id)
      break
    case 'comment':
      router.push({
        path: '/comment',
        query: {
          id: row.id
        }
      })
      break
  }
}

const playHandler = async (item: GetMusicDetailData, index: number) => {
  const { success } = await checkMusic(item.id)
  if (success === false) {
    copyrightVisible.value = true
    return
  }

  if (music.state.playQueue?.id === music.state.viewingPlaylist?.id) {
    if (window.$audio.isPlay && props.currentSong.id === item.id) {
      return
    }
    if (!window.$audio.isPlay && props.currentSong.id === item.id) {
      return window.$audio.play()
    }
  }

  id.value = item.id
  emit('play', item, index)

  // 如果传入了listInfo和ids，总是更新playQueue，确保当前播放列表上下文正确
  if (props.ids && props.listInfo) {
    music.updatePlayQueue({ tracks: props.list, ...props.listInfo }, props.ids)
  }
}

const mousedownHandler = (item: GetMusicDetailData) => {
  id.value = item.id
}

const isLike = (item: GetMusicDetailData) => {
  return store.userLikeIds.includes(item.id)
}

const activeText = (item: GetMusicDetailData) => {
  if (item.id === undefined) {
    return false
  } else if (props.listInfo) {
    return item.id === props.currentSong.id && props.listInfo.id === music.state.playQueue?.id
  } else {
    return item.id === props.currentSong.id
  }
}

const singerDetail = (id: number) => {
  router.push(`/singer-page?id=${id}`)
}

const closeCopyrightVisible = () => {
  copyrightVisible.value = false
}

const handleSearch = (val: string) => {
  searchKeyword.value = val
  if (!val.trim().length) {
    filterList.value = props.list
  } else {
    filterList.value = props.list.filter((item) => {
      const alName = item.al?.name || ' '
      const keywords = [item.name?.toLowerCase(), alName.toLowerCase()]
      item.ar?.forEach((a) => {
        if (a.name) {
          keywords.push(a.name.toLowerCase())
        }
      })
      return keywords.some((keyword) => keyword.includes(val?.toLowerCase()))
    })
  }
}

watch(
  () => props.loading,
  (val) => {
    if (props.isLoadingEndflyback && val) {
      document.querySelector('.main')!.scrollTop = 0
    }
  }
)
/**
 * 存储列表项的DOM引用，用于滚动定位
 * 内存优化: 在列表更新时清理旧引用，避免累积
 */
const itemRefs = ref<Record<number, HTMLDivElement>>({})
const setItemRef = (el: any, id: number) => {
  if (el) {
    itemRefs.value[id] = el.$el || el
  } else {
    // 元素被卸载时删除引用
    delete itemRefs.value[id]
  }
}
watch(
  () => props.loading,
  async (value) => {
    if (!value && route.query.position && music.state.searchList.length > 0) {
      const target = music.state.searchList.find((item) =>
        props.list.find((listItem) => item.id === listItem.id)
      )
      console.log('target', target)

      if (target) {
        nextTick(() => {
          const targetEl = itemRefs.value[target.id]
          targetEl.classList.add('position-target')
          const scrollEl = document.querySelector('.body')
          if (targetEl && scrollEl) {
            scrollEl.scrollTo({
              top: targetEl.getBoundingClientRect().top - scrollEl.clientHeight / 2.35,
              behavior: 'smooth'
            })
            targetEl.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'
            targetEl
              .animate(
                [
                  { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
                  { backgroundColor: 'rgba(255, 255, 255, 0)' }
                ],
                {
                  duration: 1300,
                  easing: 'ease-in-out',
                  delay: 3000
                }
              )
              .finished.then(() => {
                targetEl.style.backgroundColor = ''
              })
          }
        })
      }
    }
  },
  {
    immediate: true
  }
)

watch(
  () => props.list,
  (val) => {
    filterList.value = val
    // 内存优化: 列表更新时清理不再存在的项的DOM引用
    const currentIds = new Set(val.map((item) => item.id))
    Object.keys(itemRefs.value).forEach((key) => {
      const id = Number(key)
      if (!currentIds.has(id)) {
        delete itemRefs.value[id]
      }
    })
  }
)
</script>

<template>
  <div class="song-list-container" :style="{ overflowY: scroll ? 'auto' : 'visible' }">
    <!-- 搜索框 -->
    <div v-if="isSearch" class="search-container" :style="{ display: loading ? 'none' : '' }">
      <VTextField
        v-model="searchKeyword"
        density="compact"
        placeholder="搜索此列表歌曲"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        :max-width="400"
        base-color="#ffffff33"
        color="#ffffff33"
        @update:model-value="handleSearch"
      />
    </div>

    <!-- 版权提示对话框 -->
    <VDialog v-model="copyrightVisible" scrim :max-width="400">
      <VCard rounded="lg">
        <VCardTitle class="d-flex justify-space-between align-center">
          <div class="text-h5 text-medium-emphasis ps-2">当前歌曲暂无音源</div>
          <VBtn icon="mdi-close" variant="text" @click="closeCopyrightVisible" />
        </VCardTitle>
        <VCardText class="d-flex justify-center align-center">
          <VBtn variant="tonal" @click="closeCopyrightVisible"> 好 </VBtn>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- 主要内容 -->
    <template v-if="loading || filterList.length">
      <!-- 标题行 -->
      <div v-if="isNeedTitle" class="title-container" :style="{ display: loading ? 'none' : '' }">
        <div
          v-for="config in columns"
          v-show="!config.hidden"
          :key="config.title"
          class="title-item"
          :class="config.class"
          :style="{ ...config.style, width: config.width }"
        >
          {{ config.title }}
        </div>
      </div>

      <!-- 歌曲列表 -->
      <div class="list-container" :style="{ display: loading ? 'none' : '' }">
        <ContextMenu
          v-for="(data, i) in filterList"
          :key="data.id"
          :items="playlistMenuItems"
          @select="(e) => handlePlaylistMenuSelect(e, data)"
        >
          <div
            :ref="(el) => setItemRef(el, data.id)"
            class="list"
            :class="{ 'disable-list': data.copyright === 0 }"
            @dblclick="() => playHandler(data, i)"
            @mousedown="() => mousedownHandler(data)"
          >
            <div
              v-for="config in columns"
              v-show="!config.hidden"
              :key="config.prop || config.type"
              class="item"
              :class="config.class"
              :style="{ ...config.style, width: config.width }"
            >
              <template v-if="config.processEl">
                <!-- 自定义处理元素 -->
                <component :is="h('div', config.processEl(h, data, i))" />
              </template>
              <template v-else-if="config.icon">
                <!-- 图标处理 -->
                <i
                  v-for="val in config.icon"
                  :key="val"
                  class="iconfont"
                  :class="{
                    'icon-xihuan1': val === 'love' && isLike(data),
                    'icon-xihuan': val === 'love' && !isLike(data)
                  }"
                  @click="val === 'love' && likeMusic(data.id, !isLike(data))"
                />
              </template>
              <template v-else-if="!config.type && config.prop">
                <!-- 普通属性 -->
                {{ lookup(data, config.prop) }}
              </template>
              <template v-else-if="config.type === 'index'">
                <!-- 索引 -->
                {{ formatCount(isPaging ? pageSize * (currentPage - 1) + (i + 1) : i + 1) }}
              </template>
              <template v-else-if="config.type === 'title'">
                <!-- 歌曲标题 -->
                <div class="title-box">
                  <VImg
                    style="max-width: 50px"
                    width="50"
                    aspect-ratio="1/1"
                    :src="lookup(data, config.picUrl) + '?param=150y150'"
                    class="pic-url"
                  />
                  <div class="name-box">
                    <div :style="{ color: activeText(data) ? 'rgb(255,60,60)' : '' }">
                      {{ lookup(data, config.prop) }}
                    </div>
                    <div class="name-container">
                      <template v-if="!data.ar">
                        {{ data.artist }}
                      </template>
                      <template v-else>
                        <span
                          v-for="(ar, index) in data.ar"
                          :key="ar.id || index"
                          :style="{
                            cursor: ar.id ? 'pointer' : 'default',
                            color: ar.id ? '' : 'rgba(150, 150, 150, 0.60)'
                          }"
                          @click="ar.id && singerDetail(ar.id)"
                        >
                          {{ ar.name || data.artist || '未知艺人' }}
                          <span v-if="index < data.ar.length - 1" style="color: #969696"> / </span>
                        </span>
                      </template>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else-if="config.type === 'album'">
                <!-- 专辑 -->
                {{ lookup(data, config.prop) || '未知专辑' }}
              </template>
            </div>
          </div>
        </ContextMenu>
      </div>
    </template>

    <!-- 空状态 -->
    <div v-else style="display: grid; place-items: center; gap: 20px">
      <div style="font-size: 20px">没有找到关于"{{ searchKeyword }}"的任何内容</div>
      <VImg :src="NotFound" width="150" />
    </div>

    <!-- 分页 -->
    <Pagination
      v-if="isPaging && total"
      background
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      @current-change="(page) => $emit('current-change', page)"
    />

    <!-- 加载状态 -->
    <div v-loading="loading" class="loading" :style="{ display: loading ? 'block' : 'none' }" />
  </div>
</template>

<style lang="scss" scoped>
.position-target {
}
/* 保留原有的样式不变 */
.song-list-container {
  flex: 1;
  position: relative;
  padding: 35px;
  .search-container {
    display: flex;
    justify-content: start;
  }
  .loading {
    position: relative;
    top: 100px;
    :deep(.el-loading-mask) {
      .el-loading-spinner {
      }
    }
  }
  .title-item.empty {
    position: relative;
    top: 2px;
    left: 2px;
  }
  .empty {
    width: 50px;
  }
  .handle {
    width: 45px;
  }
  .title {
    width: 45%;
    color: $text;
    flex-shrink: 0;
    @include textOverflow();
  }

  .album {
    width: 35%;
    flex-shrink: 0;
    @include textOverflow();
  }
  .time {
    width: 10%;
  }
  .title-container {
    display: flex;
    font-size: 14px;
    height: 35px;
    color: $darkText;
    padding: 0 20px;
    gap: 10px;
    .title-item {
      text-align: left;
      flex-shrink: 0;
    }
    .title-item.title {
      color: $darkText;
    }
  }
  .list.disable-list {
    //background-color: rgba(0, 0, 0, 0.3);
  }
  .list {
    gap: 10px;
    font-size: 14px;
    display: flex;
    height: 70px;
    color: $darkText;
    align-items: center;
    padding: 0 20px;
    border-radius: 10px;
    .title-box {
      display: flex;
      .pic-url {
        height: 50px;
        width: 50px;
        border-radius: 8px;
        margin-right: 10px;
        flex-shrink: 0;
      }
      .name-box {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        flex: 1;
        min-width: 0;
        .name-container {
          color: $text;
        }
        .title {
          color: $text;
        }
        > div {
          @include textOverflow();
        }
        .name {
          font-size: 13px;
          color: $darkText;
        }
      }
    }
    .name {
      cursor: pointer;
      &:hover {
        color: $text !important;
      }
    }
    .item {
      text-align: left;
      flex-shrink: 0;
    }
    .handle {
      font-size: 18px;
      cursor: pointer;
      .icon-xihuan1 {
        font-size: 18px;
        color: #eb4141;
        margin-left: 4px;
      }
      .icon-xihuan {
        color: #a5a7a8;
        font-size: 19px;
        margin-left: 4px;
      }
    }

    &:hover {
      background-color: rgba(255, 255, 255, 0.06) !important;
    }
  }
}
</style>
