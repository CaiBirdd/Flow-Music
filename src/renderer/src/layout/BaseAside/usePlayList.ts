//封装获取与维护当前歌单（或日推）数据的逻辑：调用音乐相关 API 拉取歌单/专辑歌曲详情、整理为播放列表状态，并同步到全局 store（用户/播放相关 store）
import { ref } from 'vue'
import {
  QueuePlaylist,
  getAlbumContent,
  getLikeMusicListIds,
  getMusicDetail,
  GetMusicDetailData,
  getPlayListDetail,
  PlaylistBase
} from '@/api/musicList'
import { useUserInfo } from '@/store'
import { useMusicAction } from '@/store/music'
import { playListMock } from '@/views/DailyRecommend/dailyRecommendSongsConfig'
import { recommendSong } from '@/api/home'

interface State {
  playList: GetMusicDetailData[]
  listInfo: PlaylistBase
  ids: number[]
  loading: boolean
}

export const playListState = ref<State>({
  playList: [],
  listInfo: {} as PlaylistBase,
  ids: [],
  loading: false
})

// 这个文件可以获取指定具有id的歌单，并帮你同步一系列store操作
export default () => {
  const store = useUserInfo()
  const music = useMusicAction()
  // 获取用户指定歌单列表
  const getPlayListDetailFn = async (
    id: number,
    type?: 'album' | string,
    isUpdateLoading: boolean = true
  ) => {
    isUpdateLoading && (playListState.value.loading = true)

    try {
      // 防止获取的是日推歌曲，因为日推歌曲没有歌单id
      if (id !== playListMock.id) {
        // 歌单能看到歌单名字, 但看不到具体歌单内容 , 调用此接口 , 传入歌单 id, 可 以获取对应歌单内的所有的音乐(未登录状态只能获取不完整的歌单,登录后是完整的)，
        //   但是返回的 trackIds 是完整的，tracks 则是不完整的，可拿全部 trackIds 请求一次 song/detail 接口获取所有歌曲的详情
        let playList
        let ids: string
        if (type === 'album') {
          const { songs } = await getAlbumContent(id)
          playList = songs
          ids = playList.map((item) => item.id).join(',')
        } else {
          const res = await getPlayListDetail(id)
          console.log(res)
          const { playlist } = res
          playList = playlist
          ids = playList.trackIds.map((item) => item.id).join(',')
        }
        music.updateViewingPlaylist(playList)
        const { songs } = await getMusicDetail(ids)
        updatePlayList({ ...playList, tracks: songs })
      } else {
        await getRecommendSongs()
      }
    } finally {
      isUpdateLoading && (playListState.value.loading = false)
    }
  }
  // 获取日推歌曲
  const getRecommendSongs = async () => {
    const { data } = await recommendSong()
    playListMock.tracks = data.dailySongs
    updatePlayList(playListMock)
    return data
  }
  const updatePlayList = async (list: QueuePlaylist) => {
    playListState.value.playList = list.tracks
    playListState.value.ids = list.tracks.map((item) => item.id)
    // 过滤掉track属性
    const { tracks, ...args } = list
    playListState.value.listInfo = args as any
    music.updateViewingPlaylist(list)
    getLikeMusicIds()
  }
  const getLikeMusicIds = async () => {
    if (store.isLogin) {
      const { ids } = await getLikeMusicListIds(store.profile.userId!)
      ids.length && store.updateUserLikeIds(ids)
    }
  }

  return {
    getPlayListDetailFn,
    updatePlayList,
    getRecommendSongs,
    getLikeMusicIds
  }
}
