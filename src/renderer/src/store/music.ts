import { defineStore } from 'pinia'
import {
  CurrentItem,
  getDynamicCover,
  getIntelliganceList,
  getLyric,
  getMusicDetail,
  GetMusicDetailData,
  getMusicUrl,
  GetPlayListDetailRes,
  updateScrobble
} from '@/api/musicList'
import { watch, ref } from 'vue'
import { parseLRC, mergeLyricsWithTranslation } from '@/utils/lyric'
import { randomNum } from '@/utils'

export type Lyric = { time: number | boolean; text: string; line: number }
interface State {
  musicUrl: string
  songs: any
  currentItem: Partial<GetPlayListDetailRes['playlist']> | null
  runtimeList: CurrentItem | null
  runtimeIds: number[]
  lyric: any
  currentTime: number
  noTimestamp: boolean
  // 原代码: bgColor: Array<Array<string>>
  bgColor: string[]
  videoPlayUrl: string | null
  // 0心动 1列表循环 2随机播放 3单曲循环
  orderStatusVal: 0 | 1 | 2 | 3
  load: boolean
  index: number
  lastIndexList: number[]
  searchList: any[]
}

// 会把用户当前正在播放的列表单独存储起来，以便切换歌单时没有播放切换的歌单不会被清空
export const useMusicAction = defineStore('musicActionId', () => {
  const state = ref<State>({
    musicUrl: '', // 用户当前播放器播放的音乐url
    songs: {}, // 用户当前播放器播放的音乐
    currentItem: null, // 用户当前选中的歌单列表，会随着用户选中的菜单变化
    runtimeList: null, // 用户当前正在播放音乐的列表
    runtimeIds: [], // 用户当前正在播放音乐的列表ids
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
   * 监听歌曲索引变化，记录播放历史
   * 内存优化: 限制历史记录最大长度为100条，防止内存持续增长
   */
  watch(
    () => state.value.index,
    (value, oldValue) => {
      state.value.lastIndexList.push(oldValue)
      // 限制历史记录最大长度，防止内存泄漏
      const MAX_HISTORY_LENGTH = 100
      if (state.value.lastIndexList.length > MAX_HISTORY_LENGTH) {
        // 只保留最近的记录
        state.value.lastIndexList = state.value.lastIndexList.slice(-MAX_HISTORY_LENGTH)
      }
    }
  )
  const updateSearchList = (val: any) => {
    state.value.searchList = val
  }
  const updateCurrentItem = (val: Partial<CurrentItem>) => {
    val.name = val.specialType === 5 ? '我喜欢的歌单' : val.name
    // 类型不匹配，使用as any断言以不影响功能
    state.value.currentItem = val as any
  }
  const updateRuntimeList = (list: CurrentItem, ids: number[]) => {
    if (list.specialType !== 5 && state.value.orderStatusVal === 0) {
      state.value.orderStatusVal = 1
    }
    state.value.runtimeList = list
    state.value.runtimeIds = ids

    getIntelliganceListHandler()
  }
  const updateTracks = (tracks: GetMusicDetailData[], ids: number[]) => {
    if (state.value.runtimeList) {
      state.value.runtimeList.tracks = tracks
      state.value.runtimeIds = ids
    }
  }
  // 获取歌词
  const getLyricHandler = async (id: number) => {
    const { lrc, tlyric } = await getLyric(id)
    console.log('获取的歌词:', lrc, tlyric)
    const result = parseLRC(lrc.lyric)
    // 合并翻译歌词
    state.value.lyric = mergeLyricsWithTranslation(result, tlyric?.lyric)
    state.value.noTimestamp = result.noTimestamp
    if (state.value.lyric.length === 1) {
      state.value.lyric = []
    }
  }
  const updateState = (data) => {
    Object.assign(state.value, data)
  }
  // 获取动态封面
  const getDynamicCoverHandler = async (id: number) => {
    try {
      const { data } = await getDynamicCover(id)
      if (data.videoPlayUrl) {
        state.value.videoPlayUrl = data.videoPlayUrl
      } else {
        state.value.videoPlayUrl = null
      }
    } catch {
      state.value.videoPlayUrl = null
    }
  }
  // 获取音乐url并播放
  const getMusicUrlHandler = async (item: GetMusicDetailData, i?: number) => {
    try {
      state.value.songs = item
      getLyricHandler(item.id)
      getDynamicCoverHandler(item.id)
      // id可能是string | number，添加as number断言
      updateScrobble(item.id, state.value.runtimeList?.id as number | undefined)
      const [{ data }] = await Promise.all([
        getMusicUrl(item.id),
        getMusicDetail(item.id.toString())
      ])
      state.value.index = i === undefined ? state.value.index : i
      if (window.$audio) {
        window.$audio.reset(true)
        await window.$audio.pause(false)
        state.value.musicUrl = data[0].url || ''
        window.$audio.cutSongHandler()
        // 监听audio是否加载完毕
        localStorage.setItem('MUSIC_CONFIG', JSON.stringify({ ...state.value, load: true }))

        /**
         * 内存优化: 先清理旧的 oncanplay 处理器，避免闭包累积
         * 每次设置新的 oncanplay 前，将旧的设为 null
         */
        window.$audio.el.oncanplay = null
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
  // const setSongCache() {
  //   localStorage.setItem('MUSIC_CONFIG', JSON.stringify({
  //
  //   }))
  // }
  // 0心动 1列表循环 2随机播放 3单曲循环
  const orderTarget = (i: 0 | 1 | 2 | 3) => {
    if (i === 0) {
      return (state.value.index + 1) % state.value.runtimeIds.length
    } else if (i === 1) {
      return (state.value.index + 1) % state.value.runtimeIds.length
    } else if (i === 2) {
      return randomNum(0, state.value.runtimeIds.length - 1)
    } else {
      return state.value.index
    }
  }
  const playEnd = () => {
    state.value.index = orderTarget((state.value?.orderStatusVal ?? 0) as 0 | 1 | 2 | 3)
    if (state.value.index > state.value.runtimeIds.length - 1) {
      return
    }
    getMusicUrlHandler(state.value.runtimeList!.tracks[state.value.index])
  }
  // 切换歌曲
  const cutSongHandler = (target: boolean) => {
    if ([0, 1, 3].includes(state.value?.orderStatusVal ?? 0)) {
      state.value.index = target ? state.value.index + 1 : state.value.index - 1
      if (state.value.index > state.value.runtimeIds.length - 1) {
        state.value.index = 0
      } else if (state.value.index < 0) {
        state.value.index = state.value.runtimeIds.length - 1
      }
      getMusicUrlHandler(state.value.runtimeList!.tracks[state.value.index])
      return
    }
    if (!target) {
      const i =
        state.value.lastIndexList[state.value.lastIndexList.length - 1] ||
        orderTarget(state.value?.orderStatusVal)
      getMusicUrlHandler(state.value.runtimeList!.tracks[i])
      state.value.lastIndexList.splice(state.value.lastIndexList.length - 1)
      return
    }
    playEnd()
  }
  // 原代码: const updateBgColor = (colors: Array<Array<string>>) => {
  //   state.bgColor = colors
  // }
  const updateBgColor = (colors: Array<Array<number>>) => {
    // 将 [89, 134, 167] 转换为 "89, 134, 167" 供 CSS v-bind 使用
    state.value.bgColor = colors.map((color) => color.join(', '))
  }
  // 获取心动歌曲列表  只支持我喜欢的列表 pid: 歌单id   id: 歌曲id
  const getIntelliganceListHandler = async () => {
    const runtimeList = state.value.runtimeList

    if (state.value.orderStatusVal !== 0 || !runtimeList || runtimeList.specialType !== 5) {
      return
    }

    const songs = state.value.songs
    // id可能是string | number，添加as number断言
    const { data } = await getIntelliganceList(
      runtimeList.id as number,
      songs.id as number,
      songs.id as number
    )

    const tracks = data
      .filter((item) => !!item.songInfo)
      .map((item) => {
        return item.songInfo!
      })
    const ids = tracks.map((item) => {
      return item!.id
    })
    updateTracks(tracks, ids)
  }

  return {
    state,
    updateState,
    updateCurrentItem,
    updateRuntimeList,
    getLyricHandler,
    getMusicUrlHandler,
    orderTarget,
    playEnd,
    cutSongHandler,
    updateBgColor,
    getIntelliganceListHandler,
    updateTracks,
    updateSearchList
  }
})
