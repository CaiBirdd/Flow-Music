<!-- 功能：渲染歌曲列表页（可搜索、播放、分页、右键菜单、显示专辑/歌手信息等）
 是歌曲列表展示与播放交互的主视图组件。 -->
<script setup lang="ts">
import { h, ref, watch } from 'vue' // vue 3.5+
import { useRouter } from 'vue-router'
import { lookup } from '@/utils'
import { GetMusicDetailData, PlaylistBase } from '@/api/musicList'
import { useUserInfo } from '@/store'
import useMusic from '@/components/MusicPlayer/useMusic'
import { useMusicAction } from '@/store/music'
import Pagination from '@/components/Pagination/index.vue'
import NotFound from '@/assets/not-found.png'
import ContextMenu from '@/components/ContextMenu/index.vue'
//定义列配置接口：这决定了列表每一列怎么渲染
// 这是一个高度可配置的列表组件，每一列显示什么内容（文本、图片、组件）都由外部传入的 columns 决定
export interface Columns {
  title: string //列标题
  hidden?: boolean
  picUrl?: string
  icon?: string[]
  prop?: string
  on?: object
  style?: object
  width?: string
  type?: 'index' | 'handle' | 'title' | 'album' //特殊渲染类型
  class?: string
  processEl?: (createVNode: typeof h, arg: any, index: number) => any //自定义渲染函数
}
//右键菜单项
const playlistMenuItems = [
  { label: '评论', value: 'comment' },
  { label: '删除歌曲', value: 'delete' }
]
//组件props定义
interface Props {
  list: GetMusicDetailData[] // 完整的歌曲数据列表
  currentSong: GetMusicDetailData // 当前正在播放的歌曲（用于高亮显示）
  columns: Columns[] // 列配置数组
  loading?: boolean
  ids?: number[]
  listInfo?: PlaylistBase | any // 当前歌单的信息
  scroll?: boolean
  isPaging?: boolean // 是否显示分页器（默认为 true）
  total?: number
  pageSize?: number
  currentPage?: number
  isLoadingEndflyback?: boolean
  isNeedTitle?: boolean
  isSearch?: boolean // 是否显示搜索框（默认为 true）
}
//Props 默认值设置
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
// 定义发出的事件：播放、翻页
const emit = defineEmits(['play', 'current-change'])

const store = useUserInfo()
const music = useMusicAction()
const { likeMusic, deleteSongHandler } = useMusic()
const router = useRouter()

//当前传入歌曲的id
const id = ref(0)
const filterList = ref(props.list) // 过滤后的列表（用于搜索结果展示）
const searchKeyword = ref('') // 搜索关键词

// 格式化序号：小于10补0（如 1 -> 01）
const formatCount = (index: number) => {
  return index.toString().length > 1 ? index : '0' + index
}

// 处理右键菜单点击事件
const handlePlaylistMenuSelect = (item: { label: string; value: string }, row) => {
  switch (item.value) {
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

//双击播放处理逻辑
const playHandler = async (item: GetMusicDetailData, index: number) => {
  // 判断逻辑：如果当前点击的歌单就是正在播放的歌单
  if (music.state.playQueue?.id === music.state.viewingPlaylist?.id) {
    // 且点击的是正在播放的同一首歌 -> 啥也不做
    if (window.$audio.isPlay && props.currentSong.id === item.id) {
      return
    }
    //如果是同一首歌但处在暂停状态 -> 恢复播放
    if (!window.$audio.isPlay && props.currentSong.id === item.id) {
      return window.$audio.play()
    }
  }

  id.value = item.id
  emit('play', item, index) // 通知父组件进行播放

  // 更新播放队列
  // 确保不管用户在哪个歌单点了歌，播放器的队列都会切换到这个当前歌单
  if (props.ids && props.listInfo) {
    music.updatePlayQueue({ ...props.listInfo, tracks: props.list }, props.ids)
  }
}
/// 鼠标按下事件（简单记录一下当前选中的歌曲 ID）
const mousedownHandler = (item: GetMusicDetailData) => {
  id.value = item.id
}
// 判断歌曲是否已喜欢（红心状态）
const isLike = (item: GetMusicDetailData) => {
  return store.userLikeIds.includes(item.id)
}
// 判断当前行是否应该高亮（变成红色字体）
const activeText = (item: GetMusicDetailData) => {
  // 逻辑：必须是当前正在播放的那首歌 (item.id === currentSong.id)
  // 并且当前歌单必须是正在播放的歌单
  if (item.id === undefined) {
    return false
  } else if (props.listInfo) {
    return item.id === props.currentSong.id && props.listInfo.id === music.state.playQueue?.id
  } else {
    return item.id === props.currentSong.id
  }
}
// 跳转歌手详情页
const singerDetail = (id: number) => {
  router.push(`/singer-page?id=${id}`)
}
//前端搜索逻辑
const handleSearch = (val: string) => {
  searchKeyword.value = val
  if (!val.trim().length) {
    filterList.value = props.list // 空关键词 -> 显示全量列表
  } else {
    // 关键词过滤：搜歌名、专辑名、歌手名
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
// 监听 Loading 状态：加载完成后如果需要，让列表滚回顶部
watch(
  () => props.loading,
  (val) => {
    if (props.isLoadingEndflyback && val) {
      document.querySelector('.main')!.scrollTop = 0
    }
  }
)
//监听 props.list 变化：源数据变了，同步更新本地的 filterList
watch(
  () => props.list,
  (val) => {
    filterList.value = val
  }
)
</script>

<template>
  <!-- 滚动容器 先渲染行再渲染列-->
  <div class="song-list-container" :style="{ overflowY: scroll ? 'auto' : 'visible' }">
    <!-- 搜索框 Vuetify 组件-->
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

    <!-- 如果有数据或正在加载，显示列表 -->
    <template v-if="loading || filterList.length">
      <!-- 表头行：循环渲染 columns 定义的列名 -->
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

      <!-- 歌曲列表内容区域 -->
      <div class="list-container" :style="{ display: loading ? 'none' : '' }">
        <ContextMenu
          v-for="(data, i) in filterList"
          :key="data.id"
          :items="playlistMenuItems"
          @select="(e) => handlePlaylistMenuSelect(e, data)"
        >
          <div
            ref="items"
            class="song-row"
            @dblclick="() => playHandler(data, i)"
            @mousedown="() => mousedownHandler(data)"
          >
            <div
              v-for="config in columns"
              v-show="!config.hidden"
              :key="config.prop || config.type"
              class="song-col"
              :class="config.class"
              :style="{ ...config.style, width: config.width }"
            >
              <!-- 自定义渲染函数 -->
              <template v-if="config.processEl">
                <component :is="h('div', config.processEl(h, data, i))" />
              </template>
              <!-- 图标列处理 -->
              <template v-else-if="config.icon">
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
              <!-- 普通文本属性列 比如时长-->
              <template v-else-if="!config.type && config.prop">
                {{ lookup(data, config.prop) }}
              </template>
              <!--序号列处理 -->
              <template v-else-if="config.type === 'index'">
                {{ formatCount(isPaging ? pageSize * (currentPage - 1) + (i + 1) : i + 1) }}
              </template>
              <!-- 歌曲标题列 -->
              <template v-else-if="config.type === 'title'">
                <div class="info-cell">
                  <!-- 封面 -->
                  <VImg
                    style="max-width: 50px"
                    width="50"
                    aspect-ratio="1/1"
                    :src="lookup(data, config.picUrl) + '?param=150y150'"
                    class="cover-img"
                  />
                  <!-- 歌名 -->
                  <div class="name-box">
                    <div :style="{ color: activeText(data) ? 'rgb(255,60,60)' : '' }">
                      {{ lookup(data, config.prop) }}
                    </div>
                    <!-- 歌手 -->
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
              <!-- 专辑列 -->
              <template v-else-if="config.type === 'album'">
                {{ lookup(data, config.prop) || '未知专辑' }}
              </template>
            </div>
          </div>
        </ContextMenu>
      </div>
    </template>

    <!-- 空状态展示 -->
    <div v-else style="display: grid; place-items: center; gap: 20px">
      <div style="font-size: 20px">没有找到关于"{{ searchKeyword }}"的任何内容</div>
      <VImg :src="NotFound" width="150" />
    </div>

    <!-- 分页器 -->
    <Pagination
      v-if="isPaging && total"
      background
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      @current-change="(page) => $emit('current-change', page)"
    />

    <!-- 加载状态遮罩 -->
    <div v-loading="loading" class="loading" :style="{ display: loading ? 'block' : 'none' }" />
  </div>
</template>

<style lang="scss" scoped>
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
  .song-row {
    gap: 10px;
    font-size: 14px;
    display: flex;
    height: 70px;
    color: $darkText;
    align-items: center;
    padding: 0 20px;
    border-radius: 10px;
    .info-cell {
      display: flex;
      .cover-img {
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
    .song-col {
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
