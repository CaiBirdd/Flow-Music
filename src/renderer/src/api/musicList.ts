import request from '../utils/request'

// 基础接口 (壳子 - 纯歌单信息)
export interface PlaylistBase {
  id: number // 歌单唯一的数字 ID
  name: string // 歌单显示的标题
  coverImgUrl: string // 封面图的 URL
  userId: number // 创建者的用户 ID
  updateTime: number // 最后更新时间戳
  createTime: number // 创建时间戳
  // 歌单的特殊类型：
  // 0:普通, 5:红心(我喜欢的), 10:置顶, 20:尾部, 100:官方, 200:视频, 300:分享
  specialType: 0 | 5 | 10 | 20 | 100 | 200 | 300
  playCount: number // 播放量 // 总播放次数
  trackCount: number // 歌单内包含的歌曲总数
  tags: Array<string> // 标签列表，如 ['华语', '流行']
  creator: {
    // 创建这个歌单的用户信息
    nickname: string
    userId: number //和外层一样
    avatarUrl: string //头像
    userType: 4 // 用户类型枚举 (4通常代表网易云普通用户)
    vipType: 11 // VIP 类型枚举
  }
  subscribed: boolean // 当前登录用户是否收藏了此歌单
  ordered: boolean // 是否是用户自己订阅/排序的
  subscribedCount: number // 该歌单被多少人收藏了
}

// [响应接口] 获取用户歌单列表的接口返回值
export interface GetUserPlayListRes {
  playlist: PlaylistBase[] // 纯歌单列表，每一项都是上面的基础壳子
  code: string // 状态码 (注意这里后端有时候返 string 有时候返 number)
  more: boolean // 是否还有更多（用于分页）
  version: string // 数据版本号
}
// [响应接口] 获取歌单详情（大礼包）
// 这个接口不仅返回 PlaylistBase 的所有信息，还附加了歌曲列表
export interface GetPlayListDetailRes {
  code: 200
  // 使用 & 交叉类型：既包含 PlaylistBase 的所有属性，又增加了详细的歌曲信息
  playlist: PlaylistBase & {
    trackIds: {
      // 完整的歌曲 ID 列表（包含所有歌曲 ID，哪怕 tracks 没返回完整的）
      id: number
      uid: number //uerId
    }[]
    tracks: GetMusicDetailData[] // 当前返回的一批歌曲详情 对应后端接口字段
  }
}

// [数据接口] 音乐播放链接数据
export type GetMusicUrlData = {
  size: number // 文件大小
  url: string // mp3/flac 的真实播放地址
}
// [响应接口] 获取音乐 URL 的返回值
interface GetMusicUrlRes {
  code: number
  data: GetMusicUrlData[] // 可能一次查多首，所以是数组
}
// [业务模型] 播放队列对象
// 这是前端自己维护的一个对象，代表“当前正在播放的列表”
// Omit<Partial<PlaylistBase>, 'id'>: 继承大部分歌单属性但设为可选，且剔除 id
// & { id... }: 重新把 id 定义为 number|string（为了兼容特殊 ID）
export interface QueuePlaylist extends Omit<Partial<PlaylistBase>, 'id'> {
  id: number | string // 歌单ID，可能是数字也是字符串
  tracks: GetMusicDetailData[] // 必有的歌曲列表
}
// [核心原子] 单曲数据结构
// 这是每一首歌的标准字段，列表里、播放器里用的都是它
export type GetMusicDetailData = {
  playCount: number // 播放次数
  al: {
    // 名称详情
    id: number
    name: string
    pic: number
    picUrl: string //专辑封面
  }
  ar: {
    // 歌手列表详情
    alias: [] // 别名列表
    id: number
    name: string //歌手名
    tns: []
  }[]
  name: string //歌曲名
  dt: number //歌曲时长
  id: number //歌曲id
  pop: number //歌曲受欢迎程度
  album: string //专辑名
  artist?: string
  copyright?: number
  playTime?: number
  [key: string]: any // 允许任意其他字段（兼容后端乱加字段）
}
// [响应接口] 歌曲详情接口返回值
interface GetMusicDetailRes {
  code: number
  songs: GetMusicDetailData[]
}
// [响应接口] 歌词接口返回值
interface GetLyricRes {
  code: number
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
  version: 39
}
// [数据接口] 云盘歌曲项
export type GetUserCloudSong = {
  fileName: string // 文件昵称，具有后缀名
  fileSize: number // 文件大小 kb
  songId: number // 文件id
  songName: string // 文件昵称，不具有后缀名
  simpleSong: GetMusicDetailData
}
//  [响应接口] 云盘列表返回值
export interface GetUserCloudRes {
  code: number
  count: number // total
  data: GetUserCloudSong[]
}
// [辅助类型] 歌手信息
type Artist = {
  picUrl: string
  id: number // 歌手id
  name: string
  albumSize: number // 专辑数量
  musicSize: number // 单曲数量
}
// 歌手专辑列表
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

// 获取喜欢音乐列表ids
export const getLikeMusicListIds = (uid: number) =>
  request.get<{ checkPoint: number; code: number; ids: number[] }>('/likelist', {
    params: { uid }
  })

// 获取用户歌单信息(左侧边栏)
export const getUserPlayList = (uid: number) =>
  request.get<GetUserPlayListRes>('/user/playlist', { params: { uid } })

// 获取音乐url evel: 'lossless' 尝试请求无损音质
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

// 歌曲动态封面
export const getDynamicCover = (id: number) =>
  request.get('/song/dynamic/cover', { params: { id } })

export const updateScrobble = (id: number, sourceid?: number) =>
  request.post('/scrobble', { id, sourceid })

// 获取用户播放记录
export const getUserRecord = (uid: number, type: number = 1) =>
  request.post('/user/record', { uid, type })
