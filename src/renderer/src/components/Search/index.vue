<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchDefault, searchHotDetail, searchSuggest } from '@/api/search'
import { getMusicDetail } from '@/api/musicList'
import { useFlags } from '@/store/flags'
import { useMusicAction } from '@/store/music'
import { isString } from '@/utils'
import { debounce } from 'lodash-es'

// 定义一条历史记录的类型
type RecordContent = {
  term: string //关键词
  time: number //搜索时间戳
  path: string //点击跳转的路径
}

// 定义 localStorage 存储历史记录的 Key，方便统一管理
const RECORD_KEY = 'RECORD_LIST'

// 配置项 配置下拉建议列表中，每个分类的标题和图标
const config = {
  allMatch: { text: '猜你想搜', icon: 'Search' }, // 这里的icon string 需要对应 icon component，暂时用 text 代替或在模板里写死
  songs: { text: '单曲', icon: '' },
  artists: { text: '歌手', icon: '' },
  albums: { text: '专辑', icon: '' },
  playlists: { text: '歌单', icon: '' }
}

const loading = ref(false) //下拉框的loading状态
const router = useRouter()
const route = useRoute()
const music = useMusicAction()
const flags = useFlags()

// 状态管理
const keywords = ref('') //输入框的值
const showSuggest = ref(false) //是否显示下拉建议列表
//控制下拉面板显示的内容，hot显示“历史+热搜”，keywords显示“搜索建议（输入的时候）”
const model = ref<'hot' | 'keywords'>('hot')
const recordContent = ref<RecordContent[]>([]) //存历史记录
const placeholderInfo = ref({ realkeyword: '', showKeyword: '' }) //默认搜索词信息
const scoreList = ref<any[]>([]) //热搜列表
const keywordsList = ref<any>({ order: [], allMatch: [] }) //存储搜索建议数据

//定时器变量，轮训默认搜索词
let searchDefaultTimer: ReturnType<typeof setTimeout> | null = null

// 初始化历史记录
recordContent.value = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]')

// 路由监听：同步搜索词 需要把url中的key同步到搜索框，歌曲详情页点歌名跳转过来的时候
watch(
  () => route.query.key,
  (newKey) => {
    if (newKey && newKey !== keywords.value) {
      keywords.value = newKey as string
    }
  }
)

/**
 * 策略模式处理搜索跳转
 */
const strategies = {
  // 猜你想搜 -> 直接搜关键词
  allMatch: (item: any) => ({
    path: `/search?key=${item.keyword}`,
    keyword: item.keyword
  }),
  songs: async (item: any) => {
    // 单曲 -> 获取完整信息后播放
    const { songs } = await getMusicDetail(item.id)
    if (songs && songs.length) {
      music.getMusicUrlHandler(songs[0])
    }
    return null // 不跳转
  },
  // 歌手 -> 跳歌手详情页
  artists: (item: any) => ({
    path: `/singer-page?id=${item.id}`,
    keyword: item.name
  }),
  // 专辑 -> 跳专辑页
  albums: (item: any) => ({
    path: `/album-list?id=${item.id}`,
    keyword: item.name
  }),
  // 歌单 -> 跳歌单页
  playlists: (item: any) => ({
    path: `/play-list?id=${item.id}`,
    keyword: item.name
  }),
  // 普通文本搜索（回车）
  search: (item: string) => ({
    path: `/search?key=${item}`,
    keyword: item
  }),
  // 点击热搜榜
  hot: (item: any) => ({
    path: `/search?key=${item.searchWord}`,
    keyword: item.searchWord
  })
}

// 统一搜索处理函数 typeof strategies是获取strategies的类型，keyof (...)是获取一个类型的所有键名
//"allMatch" | "songs" | "artists" | "albums" | "playlists" | "search" | "hot" 然后设置默认为Search
const searchHandler = async (item: any, key: keyof typeof strategies = 'search') => {
  //防空处理
  if (isString(item) && !item.length) return

  showSuggest.value = false //选中后关闭下拉框

  // 拿到对应策略函数
  const strategy = strategies[key]
  //如果策略返回null，比如播放歌曲，不需要跳转，直接结束
  if (!strategy) return
  //执行策略，拿到跳转的目标
  const result = await strategy(item)

  // result 为 null 说明已经在策略里处理完了（比如播放歌曲），不需要跳转
  if (!result) return

  const { path, keyword } = result

  // 更新输入框
  keywords.value = keyword || keywords.value // 如果策略没返回keyword就保持原样

  // 记录历史（除非是播放歌曲）
  if (key !== 'songs') {
    updateHistory(keyword || item) // 简化的历史记录更新
    router.push(path) //这里执行路由跳转
  }
}

// 辅助：更新历史记录
const updateHistory = (term: string) => {
  if (!term) return
  //查重：如果已经搜过这个词，先删掉旧的（为了把它顶到最前面）
  const index = recordContent.value.findIndex((r) => r.term === term)
  if (index >= 0) recordContent.value.splice(index, 1)

  // 构建新记录
  const historyItem: RecordContent = {
    term,
    time: Date.now(),
    path: `/search?key=${term}`
  }
  // 插入到数组头部
  recordContent.value.unshift(historyItem)
  // 持久化到 localStorage
  localStorage.setItem(RECORD_KEY, JSON.stringify(recordContent.value))
}
// 清空所有历史
const clearRecord = () => {
  localStorage.removeItem(RECORD_KEY)
  recordContent.value = []
}
// 点击历史标签 (复用逻辑)
const recordTagClick = (item: RecordContent, index: number) => {
  // 把被点的这个词顶到最前面 先删除后添加
  recordContent.value.splice(index, 1)
  recordContent.value.unshift(item)
  // 持久化到 localStorage
  localStorage.setItem(RECORD_KEY, JSON.stringify(recordContent.value))
  //跳转+更新输入框
  router.push(item.path)
  keywords.value = item.term
  showSuggest.value = false
}
// 删除单个历史标签
const deleteTag = (index: number) => {
  recordContent.value.splice(index, 1)
  localStorage.setItem(RECORD_KEY, JSON.stringify(recordContent.value))
}
// 输入框聚焦 (Focus)
const focusHandler = async () => {
  showSuggest.value = true // 显示下拉框
  flags.isOpenSearch = true // 设置全局状态给header用
  // 如果还没加载过热搜榜，就去加载一次
  // 这种“懒加载”逻辑很好，避免了一进页面就发请求
  if (!scoreList.value.length) {
    loading.value = true
    const res = await searchHotDetail()
    loading.value = false
    scoreList.value = res.data
  }
}
// 输入框失焦 (Blur)
const blurHandler = () => {
  // 如果立刻关闭 `showSuggest.value = false`，此时用户的点击事件还没传递给下拉框里的 item，下拉框就消失了，导致点击无效
  // 300ms 足够让 click 事件先触发。
  setTimeout(() => {
    flags.isOpenSearch = false
    showSuggest.value = false
  }, 300)
}

// 搜索建议防抖
const suggestDebounce = debounce((val: string) => {
  getSearchSuggest(val)
}, 300)

// 输入事件 - 决定显示哪个面板
const inputHandler = () => {
  // 如果单机进入或者删空了 -> 切回 'hot' 模式（显示历史和热搜）
  if (keywords.value === '') {
    model.value = 'hot'
    focusHandler() // 重新获取焦点逻辑（如果需要的话，其实只是确保 list 显示）
    return
  }
  model.value = 'keywords' // 否则 -> 切为 'keywords' 模式，去请求搜索建议
  suggestDebounce(keywords.value)
}

// 高亮关键词 给匹配到的文字加个 <span style="color:blue"> list是后端返回的搜索建议列表
//这里的keyname有两种，一个是歌名‘name’，还有个搜索词‘keyword’
const highlightText = (list: any[], keyName: string) => {
  if (!list) return
  //创建正则，忽略大小写 内容就是输入的keywords，忽略大小写
  const regExp = new RegExp(keywords.value, 'i')
  list.forEach((item) => {
    const text = item[keyName]
    if (text) {
      // 这里的逻辑是：拿着 regExp 去 text 里找，每找到一个匹配项，就调用一次箭头函数 match的参数就是找到的那个词
      item.text = text.replace(
        regExp,
        (match) => `<span style="color:lightskyblue">${match}</span>`
      )
    }
  })
}
// 获取搜索建议 (防抖建议加在这里，目前没有加，打字快会发很多请求)
const getSearchSuggest = async (kw: string) => {
  loading.value = true
  keywordsList.value = { order: [], allMatch: [] } // 先清空，防止界面显示脏数据

  try {
    // 并行发两个请求：普通建议pc 和 移动端建议(专门为了拿猜你想搜)
    // Promise.all 同时发两个请求，等两个都回来才继续，耗时取决于最慢的那个
    const [suggest, songs] = await Promise.all([searchSuggest(kw), searchSuggest(kw, 'mobile')])

    // 处理普通建议pc
    if (suggest.result) {
      //后端返回的songs, artists 等数组，全部塞进 keywordsList 里
      keywordsList.value = { ...keywordsList.value, ...suggest.result }
      // 遍历所有分类(key 就是 'songs' 或 'artists')进行高亮处理
      if (keywordsList.value.order) {
        keywordsList.value.order.forEach((key: string) => {
          if (keywordsList.value[key]) {
            highlightText(keywordsList.value[key], 'name')
          }
        })
      }
    }
    // 处理“猜你想搜” (allMatch)
    if (songs.result?.allMatch) {
      keywordsList.value.allMatch = songs.result.allMatch
      if (!keywordsList.value.order) keywordsList.value.order = []
      // 高亮处理
      highlightText(keywordsList.value.allMatch, 'keyword')

      // 确保 allMatch 放在列表最前面 还是先查找 有就删除然后再插到最前面
      const idx = keywordsList.value.order.indexOf('allMatch')
      if (idx > -1) keywordsList.value.order.splice(idx, 1)
      keywordsList.value.order.unshift('allMatch')
    }
  } finally {
    loading.value = false
  }
}

// 默认搜索词轮播
const getSearchDefault = async () => {
  try {
    const { data } = await searchDefault()
    placeholderInfo.value = {
      realkeyword: data.realkeyword, //实际搜索词
      showKeyword: data.showKeyword //展示给用户看的
    }
  } catch (e) {
    console.error(e)
  }
  // 30秒后再次获取
  if (searchDefaultTimer) clearTimeout(searchDefaultTimer)
  searchDefaultTimer = setTimeout(getSearchDefault, 30000)
}
//启动轮播
getSearchDefault()
//销毁时清理定时器
onUnmounted(() => {
  if (searchDefaultTimer) {
    clearTimeout(searchDefaultTimer)
    searchDefaultTimer = null
  }
})
// 计算最终搜索词：如果用户没输入，就用 placeholder 的默认词
const realkeyword = computed(() => {
  return keywords.value.length ? keywords.value : placeholderInfo.value.realkeyword
})
</script>

<template>
  <!--  @keyup.enter: 监听回车键，按下回车触发搜索 (searchHandler)-->
  <div class="search-container" @keyup.enter="searchHandler(realkeyword, 'search')">
    <!-- 搜索图标 -->
    <el-icon
      class="search-icon"
      size="18px"
      color="rgba(255, 255, 255, 0.5)"
      @click="searchHandler(realkeyword, 'search')"
    >
      <Search />
    </el-icon>
    <!-- 搜索框 -->
    <input
      v-model.trim="keywords"
      class="search"
      :placeholder="placeholderInfo.showKeyword"
      @keydown.stop
      @focus="focusHandler"
      @blur="blurHandler"
      @input="inputHandler"
    />

    <!-- 下拉建议面板 -->
    <div v-show="showSuggest" v-loading="loading" class="suggest">
      <div class="list">
        <!-- 模式一： 历史& 热搜 -->
        <template v-if="model === 'hot'">
          <!-- 历史记录 -->
          <div v-show="recordContent.length" class="record">
            <div class="list-title-container">
              <span class="list-title">搜索历史</span>
              <el-icon color="rgba(255, 255, 255, 0.3)" class="clear" @click="clearRecord">
                <DeleteFilled />
              </el-icon>
            </div>
            <!-- 历史标签列表 -->
            <div class="record-list">
              <!-- 遍历历史记录 -->
              <div v-for="(item, index) in recordContent" :key="item.term" class="record-item">
                <!-- 标签本体：点击后重新搜索该词 -->
                <span class="record-tag" @click="recordTagClick(item, index)">{{ item.term }}</span>
                <!-- 删除按钮 悬停时显示，点击删除单条 -->
                <el-icon color="rgba(255, 255, 255, 0.3)" class="delete" @click="deleteTag(index)">
                  <CircleCloseFilled />
                </el-icon>
              </div>
            </div>
          </div>

          <!-- 热搜榜单 -->
          <div class="hot-search">
            <div class="list-title">热搜榜单</div>
            <!-- 遍历热搜数据 -->
            <div
              v-for="(item, index) in scoreList"
              :key="item.searchWord"
              class="item"
              @click="searchHandler(item, 'hot')"
            >
              <!-- 排名数字：前三名 (index < 3) 会有特殊样式 'top-three' -->
              <div class="sort" :class="{ 'top-three': index < 3 }">{{ index + 1 }}</div>
              <div class="content">
                <div class="title">
                  <span class="name">{{ item.searchWord }}</span>
                  <!-- 如果有图标 (比如 "新", "热") 就显示 -->
                  <img v-if="item.iconUrl" :src="item.iconUrl" class="icon" />
                  <!-- 热度分数 -->
                  <span class="score">{{ item.score }}</span>
                </div>
                <!-- 描述文本 -->
                <div class="desc">{{ item.content }}</div>
              </div>
            </div>
          </div>
        </template>

        <!-- 模式二：搜索建议 -->
        <!-- 当用户正在输入时显示 -->
        <template v-if="model === 'keywords'">
          <!-- 外层循环：遍历分类顺序 (比如 ['allMatch', 'songs', 'artists']) -->
          <div v-for="(key, index) in keywordsList.order" :key="index" class="suggest-group">
            <div v-if="config[key]" class="group-title">
              <!-- 如果是 allMatch (猜你想搜)，前面加个放大镜图标 -->
              <el-icon v-if="key === 'allMatch'"><Search /></el-icon>
              <!-- 显示中文标题 (比如 "单曲", "歌手") -->
              {{ config[key].text }}
            </div>
            <!-- 内层循环：遍历该分类下的具体项 -->
            <div
              v-for="(target, indexIn) in keywordsList[key]"
              :key="indexIn"
              class="item suggest-item"
              @click="searchHandler(target, key as any)"
            >
              <div class="name" v-html="target.text"></div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.search-container {
  position: relative;
  padding: 0 15px;
  border-radius: 8px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);

  .search-icon {
    margin-right: 10px;
    cursor: pointer;
  }

  .search {
    border: none;
    width: 230px;
    height: 37px;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: white;
    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
  }

  // 深度选择器覆盖 Element Plus loading 样式
  :deep(.suggest) {
    position: absolute;
    border-radius: 10px;
    width: 400px;
    max-height: 77vh;
    background-color: rgb(45, 45, 56); // 保持原色
    left: 50%;
    bottom: -3vh;
    transform: translateX(-50%) translateY(100%);
    z-index: 10;
    overflow: auto;

    .el-loading-mask {
      background: transparent;
    }

    .list {
      padding: 20px 0;

      .list-title {
        padding: 0 30px;
        margin-bottom: 10px;
        color: $darkText;
        font-size: 14px;
      }

      // 历史记录
      .record {
        padding: 0 30px;
        margin-bottom: 20px;
        .list-title-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          .clear {
            cursor: pointer;
            &:hover {
              color: rgba(255, 255, 255, 0.7);
            }
          }
        }
        .record-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          .record-item {
            position: relative;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 5px;
            &:hover .delete {
              display: block;
            }

            .record-tag {
              display: block;
              padding: 5px 12px;
              font-size: 13px;
              cursor: pointer;
              max-width: 150px;
              @include textOverflow;
              &:hover {
                color: white;
              }
            }
            .delete {
              display: none;
              position: absolute;
              top: -5px;
              right: -5px;
              background: #333;
              border-radius: 50%;
              cursor: pointer;
            }
          }
        }
      }

      // 通用列表项 (热搜 & 建议)
      .item {
        display: flex;
        align-items: center;
        height: 50px;
        padding: 0 30px;
        cursor: pointer;
        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        // 热搜特有样式
        .sort {
          margin-right: 20px;
          color: $darkText;
          width: 20px;
          &.top-three {
            color: #ff3a3a;
            font-weight: bold;
          }
        }

        .content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          .title {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            .name {
              font-size: 14px;
              font-weight: 500;
              color: $text;
              margin-right: 8px;
            }
            .icon {
              width: 14px;
              height: 14px;
              margin-right: 5px;
            }
            .score {
              font-size: 12px;
              color: $moreDark;
            }
          }
          .desc {
            font-size: 12px;
            color: $moreDark;
            @include textOverflow;
          }
        }
      }

      // 建议模式特有
      .suggest-group {
        .group-title {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 10px 30px 5px;
          font-size: 13px;
          color: $darkText;
          background: rgba(0, 0, 0, 0.1);
        }
        .suggest-item {
          height: 40px;
          .name {
            font-size: 13px;
            color: $text;
          }
        }
      }
    }
  }
}
</style>
