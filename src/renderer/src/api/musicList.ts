import request from '../utils/request'

export type PlayList = Omit<GetPlayListDetailRes['playlist'], 'tracks'>

export interface GetUserPlayListRes {
  playlist: PlayList[]
  code: string
  more: boolean
  version: string
}

// specialType 注解
//   0	普通歌单
//   5	红心歌单
//   10	置顶歌单
//   20	尾部歌单
//   100	官方歌单
//   200	视频歌单
//   300	分享歌单
export interface GetPlayListDetailRes {
  code: 200
  playlist: {
    id: number // 歌单id
    name: string // 歌单名称
    coverImgUrl: string // 歌单封面图片
    userId: number // 创建歌单的用户id
    updateTime: number
    createTime: number // 创建时间
    specialType: 0 | 5 | 10 | 20 | 100 | 200 | 300
    playCount: number // 播放量
    trackCount: number //歌单下歌曲总数
    tags: Array<string>
    trackIds: {
      id: number
      uid: number
    }[]
    tracks: GetMusicDetailData[]
    creator: {
      // 创建这个歌单的用户信息
      nickname: string
      userId: number
      avatarUrl: string
      userType: 4
      vipType: 11
    }
    subscribed: boolean // 是否收藏
    ordered: boolean
    subscribedCount: number // 收藏总数
  }
}

export type getMusicUrlData = {
  size: number
  url: string
}

interface GetMusicUrlRes {
  code: number
  data: getMusicUrlData[]
}
export type CurrentItem = Partial<Omit<PlayList, 'id' | 'tracks'>> & {
  id: number | string
  tracks: GetMusicDetailData[]
}
export type GetMusicDetailData = {
  playCount: number
  al: {
    // 名称详情
    id: number
    name: string
    pic: number
    picUrl: string
  }
  ar: {
    // 歌手列表详情
    alias: [] // 别名列表
    id: number
    name: string
    tns: []
  }[]
  name: string
  dt: number
  id: number
  pop: number
  album: string
  artist?: string
  copyright?: number
  playTime?: number
  [key: string]: any
}

interface GetMusicDetailRes {
  code: number
  songs: GetMusicDetailData[]
}
interface GetLyricRes {
  code: number
  klyric: {
    // 卡拉歌词(逐字)
    lyric: string // 可能会返回空串
    version: number
  }
  lrc: {
    // 逐行歌词
    lyric: string // 可能会返回空串
    version: number
  }
  tlyric: {
    // 翻译歌词
    lyric: string // 可能会返回空串
    version: number
  } | null
  yrc: {
    // 网易云逐字歌词
    lyric: string
  } | null
  version: 39
}

export type GetUserCloudSong = {
  fileName: string // 文件昵称，具有后缀名
  fileSize: number // 文件大小 kb
  songId: number // 文件id
  songName: string // 文件昵称，不具有后缀名
  simpleSong: GetMusicDetailData
}

export interface GetUserCloudRes {
  code: number
  count: number // total
  data: GetUserCloudSong[]
}

type Artist = {
  picUrl: string
  id: number // 歌手id
  name: string
  albumSize: number // 专辑数量
  musicSize: number // 单曲数量
}
export interface GetArtistAlbumRes {
  artist: Artist
  code: number
  hotAlbums: Array<{
    alias: string[]
    artist: Artist
    artists: Array<Artist>
    awardTags: string[]
    blurPicUrl: string
    company: string // 公司
    companyId: number
    description: string
    id: number // 专辑id
    name: string
    picUrl: string // 封面图片
  }>
  more: boolean
}

interface GetIntelliganceListRes {
  code: number
  message: string
  data: {
    id: number // 根对象ID
    alg: string // 算法
    recommended: boolean // 这个字段表示如果为false则表示当前歌曲是“已喜欢”列表里的，false则反之
    songInfo: GetMusicDetailData | null // 歌曲信息
  }[]
}

// 获取喜欢音乐列表ids
export const getLikeMusicListIds = (uid: number) =>
  request.get<{ checkPoint: number; code: number; ids: number[] }>('/likelist', {
    params: { uid }
  })

// 获取用户歌单信息
export const getUserPlayList = (uid: number) =>
  request.get<GetUserPlayListRes>('/user/playlist', { params: { uid } })

// 获取歌单所有歌曲   最多只能获取十首
export const getUserPlayListMusic = (id: number) =>
  request.get('/playlist/track/all', { params: { id, limit: 10, offset: 0 } })

// 获取音乐url
export const getMusicUrl = (id: number) =>
  request.get<GetMusicUrlRes>('/song/url/v1', { params: { id, level: 'lossless' } })

// 获取歌单详情  可以获取歌单全部歌曲
export const getPlayListDetail = (id: number) =>
  request.get<GetPlayListDetailRes>('/playlist/detail', { params: { id } })

// 获取歌曲详情
export const getMusicDetail = (ids: string) =>
  request.get<GetMusicDetailRes>('/song/detail', { params: { ids } })

// 对歌单添加或删除歌曲
export const addOrDelPlaylist = (op: 'add' | 'del', pid: number, tracks: number) =>
  request.post('/playlist/tracks', { op, pid, tracks })

// 喜欢音乐
export const likeMusicApi = (id: number, like: boolean = true) =>
  request.get<{ code: number; playlistId: number; songs: GetMusicDetailData[] }>('/like', {
    params: { id, like }
  })

// 获取歌词
export const getLyric = (id: number | string) =>
  request.get<GetLyricRes>('/lyric', { params: { id } })

// 获取云盘歌曲
export const getUserCloud = (limit?: number, offset?: number) =>
  request.get<GetUserCloudRes>('/user/cloud', { params: { limit, offset } })

// 获取歌手专辑
export const getArtistAlbum = (id: number, limit?: number) =>
  request.get<GetArtistAlbumRes>('/artist/album', { params: { id, limit } })

// 获取专辑内容
export const getAlbumContent = (id: number) => request.get('/album', { params: { id } })

// 获取歌曲评论
// 0: 歌曲 1: mv 2: 歌单 3: 专辑 4: 电台节目 5: 视频 6: 动态 7: 电台
export const getCommentMusic = (
  id: number,
  type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  pageNo: number,
  pageSize?: number,
  sortType?: 1 | 2 | 3,
  cursor?: number
) => request.get('/comment/new', { params: { id, type, pageNo, pageSize, sortType, cursor } })

export const getRecordSong = (limit = 200) => request.post('/record/recent/song', { limit })

// 心动模式/智能播放
export const getIntelliganceList = (pid: number, id: number, sid: number) =>
  request.get<GetIntelliganceListRes>('/playmode/intelligence/list', {
    params: { pid, id, sid }
  })

// 歌曲动态封面
export const getDynamicCover = (id: number) =>
  request.get('/song/dynamic/cover', { params: { id } })

export const updateScrobble = (id: number, sourceid?: number) =>
  request.post('/scrobble', { id, sourceid })

// 获取用户播放记录
export const getUserRecord = (uid: number, type: number = 1) =>
  request.post('/user/record', { uid, type })

// 云盘歌曲信息匹配纠正
export const updateCloudMatch = (uid: number, sid: string, asid: string) =>
  request.get('/cloud/match', { params: { uid, sid, asid } })
