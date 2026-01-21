import { defineStore } from 'pinia'
import {
  QueuePlaylist, // [类型] 播放队列结构：包含 ID 和 tracks (歌曲列表) 的对象，通常对应一个歌单
  getDynamicCover, // [API]  获取动态封面url
  getLyric, // [API]  获取歌词（包括原版和翻译版）
  getMusicDetail, // [API]  获取歌曲详细详情（时长、专辑封面等）
  GetMusicDetailData, // [类型] getMusicDetail 函数返回 单曲数据的标准接口定义 (包含 name, ar, al, dt 等字段)
  getMusicUrl, // [API]  核心！获取 MP3 播放链接
  GetPlayListDetailRes, // [类型] 歌单详情的完整结构
  updateScrobble // [API]  听歌打卡（告诉服务器“我听了这首歌”，用于更新听歌记录）
} from '@/api/musicList'
import { watch, ref } from 'vue'
import { parseLRC, mergeLyricsWithTranslation } from '@/utils/lyric'
import { randomNum } from '@/utils'

// 定义解析后的歌词的单行数据结构：时间(秒)、文本内容、行号
export type Lyric = { time: number | boolean; text: string; line: number }
interface State {
  musicUrl: string // 当前播放的 MP3 链接
  currentSong: GetMusicDetailData // 当前歌曲的完整详细信息 (对象)
  viewingPlaylist: Partial<GetPlayListDetailRes['playlist']> | null // 当前用户选中的那个歌单（注意：不一定是正在播放的列表，是用户点击查看的列表）
  playQueue: QueuePlaylist | null // 【核心】当前正在播放器里跑的那个列表（播放队列）
  playQueueIds: number[] // 播放队列里所有歌曲的 ID 数组（方便查找上一首下一首）
  lyric: any // 解析后的歌词数组
  currentTime: number // 当前播放进度（秒
  noTimestamp: boolean // 标记这首歌是不是没歌词（纯音乐）
  bgColor: string[] // 根据封面算出来的背景渐变色，存的是 ["rbg(..)", "rgb(..)"] 字符串
  videoPlayUrl: string | null // 动态封面的视频 URL
  // 播放模式：0列表循环 1随机播放 2单曲循环
  orderStatusVal: 0 | 1 | 2
  load: boolean // 音频是否加载中
  index: number // 当前播放的歌在队列里的下标 (比如第 3 首，index=2)
  lastIndexList: number[] // 随机播放的历史记录栈（方便随机模式下点“上一首”能回去）
  searchList: any[] // 临时存储搜索结果列表
}

// 会把用户当前正在播放的列表单独存储起来，以便切换歌单时没有播放切换的歌单不会被清空
export const useMusicAction = defineStore('musicActionId', () => {
  const state = ref<State>({
    musicUrl: '', // 用户当前播放器播放的音乐url
    currentSong: {} as GetMusicDetailData, // 用户当前播放器播放的音乐
    viewingPlaylist: null, // 用户当前选中的歌单列表，会随着用户选中的菜单变化
    playQueue: null, // 用户当前正在播放音乐的列表
    playQueueIds: [], // 用户当前正在播放音乐的列表ids
    lyric: [],
    currentTime: 0,
    noTimestamp: false,
    bgColor: [], // 当前正在播放的音乐主题色
    videoPlayUrl: '',
    orderStatusVal: 0,
    load: false,
    lastIndexList: [],
    index: 0,
    searchList: []
  })
  /**
   * 监听歌曲下标变化，记录播放历史
   * 只要 index 变了（切歌了），就把旧的 index (oldValue) 存进历史记录栈
   * 主要为了：随机播放模式下，用户点“上一首”时知道该切回哪首
   */
  watch(
    () => state.value.index,
    (value, oldValue) => {
      state.value.lastIndexList.push(oldValue)
    }
  )
  //更新搜索列表
  const updateSearchList = (val: any) => {
    state.value.searchList = val
  }
  // 更新“当前查看的歌单”信息
  const updateViewingPlaylist = (val: Partial<QueuePlaylist>) => {
    // 特殊处理：如果是“我喜欢的音乐” 强制更名
    val.name = val.specialType === 5 ? '我喜欢的歌单' : val.name
    // 将传入的歌单信息更新到 state.viewingPlaylist
    state.value.viewingPlaylist = val as any
  }
  // 【重要】更新播放队列
  // 当用户在歌单里点“播放全部”或者切到新歌单播放时调用
  const updatePlayQueue = (list: QueuePlaylist, ids: number[]) => {
    state.value.playQueue = list // 更新播放队列对象
    state.value.playQueueIds = ids // 更新播放队列 ID 列表
  }

  // 获取歌词
  const getLyricHandler = async (id: number) => {
    const { lrc, tlyric } = await getLyric(id)
    console.log('获取的歌词:', lrc, tlyric)
    // 解析原版 LRC 歌词
    const result = parseLRC(lrc.lyric)
    // 将原版歌词与翻译歌词进行合并
    state.value.lyric = mergeLyricsWithTranslation(result, tlyric?.lyric)
    // 设置是否有时间轴标记
    state.value.noTimestamp = result.noTimestamp
    // 如果解析结果只有一行且可能是无效信息，则置空
    if (state.value.lyric.length === 1) {
      state.value.lyric = []
    }
  }
  //批量更新 State (辅助函数)
  const updateState = (data) => {
    Object.assign(state.value, data)
  }
  // 获取动态封面
  const getDynamicCoverHandler = async (id: number) => {
    try {
      const { data } = await getDynamicCover(id)
      // 如果有视频 URL，则更新 state
      if (data.videoPlayUrl) {
        state.value.videoPlayUrl = data.videoPlayUrl
      } else {
        state.value.videoPlayUrl = null
      }
    } catch {
      // 异常处理：置空
      state.value.videoPlayUrl = null
    }
  }
  // 获取音乐url并开始播放
  const getMusicUrlHandler = async (item: GetMusicDetailData, i?: number) => {
    try {
      state.value.currentSong = item // 更新当前歌曲信息
      getLyricHandler(item.id) // 异步获取歌词
      getDynamicCoverHandler(item.id) // 异步获取动态封面
      // id可能是string | number，添加as number断言
      //上报听歌记录
      updateScrobble(item.id, state.value.playQueue?.id as number | undefined)
      // 并行请求：获取播放 URL 和 歌曲详情(为了确认时长等信息)
      const [{ data }] = await Promise.all([
        getMusicUrl(item.id),
        getMusicDetail(item.id.toString())
      ])
      // 如果传入了索引 i，则更新当前播放索引 (用于切歌)
      state.value.index = i === undefined ? state.value.index : i
      // 操作全局音频对象 window.$audio 进行播放
      if (window.$audio) {
        window.$audio.reset(true) // 重置播放器状态
        await window.$audio.pause(false) // 先暂停当前播放
        state.value.musicUrl = data[0].url || '' // 设置新的音频 URL
        window.$audio.resetLyricPlayer() // 通知播放器组件重置歌词 (初始化歌词等)
        // 将当前状态持久化到 localStorage (以便刷新后和启动应用时恢复)
        localStorage.setItem('MUSIC_CONFIG', JSON.stringify({ ...state.value, load: true }))
        // 监听 audio 元素的 oncanplay 事件，这就绪后开始播放 下了一段就能播放了
        window.$audio.el.oncanplay = async () => {
          try {
            await window.$audio.play()
          } catch (error) {
            console.error('播放失败:', error)
          }
        }
      }
    } catch (e) {
      console.log('getMusicUrlHandler函数错误：', e)
    }
  }
  // 0列表循环 1随机播放 2单曲循环
  const orderTarget = (i: 0 | 1 | 2) => {
    if (i === 0) {
      // 列表循环: 下一首
      return (state.value.index + 1) % state.value.playQueueIds.length
    } else if (i === 1) {
      // 随机播放
      return randomNum(0, state.value.playQueueIds.length - 1)
    } else {
      // 单曲循环: 保持当前
      return state.value.index
    }
  }
  // 自然播放结束时的处理逻辑
  const playEnd = () => {
    // 计算下一首要放谁
    //??的意思是 如果前面的结果为null或者undefined，就用0代替
    state.value.index = orderTarget((state.value?.orderStatusVal ?? 0) as 0 | 1 | 2)
    // 边界检查
    if (state.value.index > state.value.playQueueIds.length - 1) {
      return
    }
    // 播放下一首
    getMusicUrlHandler(state.value.playQueue!.tracks[state.value.index])
  }
  // 手动切歌处理 (上一首/下一首)
  // target: true = 下一首, false = 上一首
  const cutSongHandler = (target: boolean) => {
    // 列表循环(0) 或 单曲循环(2) 在手动切歌时逻辑一致: 上一首/下一首
    if (state.value.orderStatusVal === 0 || state.value.orderStatusVal === 2) {
      state.value.index = target ? state.value.index + 1 : state.value.index - 1
      // 循环边界处理
      if (state.value.index > state.value.playQueueIds.length - 1) {
        state.value.index = 0
      } else if (state.value.index < 0) {
        state.value.index = state.value.playQueueIds.length - 1 // 到头了去到末尾
      }
      // 播放
      getMusicUrlHandler(state.value.playQueue!.tracks[state.value.index])
      return
    }
    // 随机播放(1) 模式下的切歌逻辑
    if (!target) {
      // 如果是点“上一首” (!target)
      // 从历史记录栈 lastIndexList 中拿出最近的一个索引
      // 如果没有历史记录，则随机生成一个
      // 如果有上一首，就听上一首；如果没上一首，就随便给我来一首。
      const i =
        state.value.lastIndexList[state.value.lastIndexList.length - 1] ??
        orderTarget(state.value?.orderStatusVal as 0 | 1 | 2)
      // 播放该历史歌曲
      getMusicUrlHandler(state.value.playQueue!.tracks[i])
      // 播放后，把刚才用过的历史记录弹出栈
      state.value.lastIndexList.splice(state.value.lastIndexList.length - 1)
      return
    }
    // 如果是点“下一首”，直接使用自然播放结束的逻辑 (生成一个新的随机下一首)
    playEnd()
  }
  // 更新背景颜色
  const updateBgColor = (colors: Array<Array<number>>) => {
    // 将 [89, 134, 167] 转换为 "89, 134, 167" 供 CSS v-bind 使用
    state.value.bgColor = colors.map((color) => color.join(', '))
  }

  return {
    state,
    updateState,
    updateViewingPlaylist, // 导出：更新查看歌单
    updatePlayQueue, // 导出：更新播放队列
    getLyricHandler,
    getMusicUrlHandler,
    orderTarget,
    playEnd,
    cutSongHandler,
    updateBgColor,
    updateSearchList
  }
})
