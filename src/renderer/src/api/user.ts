import request from '@/utils/request'

//用户基础信息类型定义
export type Profile = {
  avatarUrl: string // 用户头像
  backgroundUrl: string // 用户背景图片
  nickname: string // 用户昵称
  createTime: number
  vipType: number
  userId: number // 用户id
  followeds: number // 粉丝数量
  newFollows: number // 关注数量
  eventCount: number // 动态数量
  gender: number // 性别 0:保密 1:男性 2:女性
  province: number // 省份id
  city: number // 城市id
  signature: string // 用户签名
}
//用户账号信息类型定义
export interface GetUserAccountRes {
  account: {
    anonimousUser: boolean // 是否匿名用户
    createTime: number
    vipType: number
    id: number // 用户id
  }
  code: number
  profile: Profile //复用上面的
}
//为了适配歌手中的user字段
export type User = {
  userId: number
  signature: string // 签名
  userName: string
  nickname: string // 账号昵称
  vipType: number // vip类型
  userType: number
  backgroundUrl: string // 用户背景
  avatarUrl: string // 用户头像
}
//歌手详情信息类型定义
export interface GetArtistDetailRes {
  message: string
  data: {
    artist: {
      albumSize: number
      alias: string[] // 歌手化名
      avatar: string // 歌手头像
      briefDesc: string
      cover: string
      id: number
      identifyTag: null | any
      identities: string[]
      musicSize: number
      mvSize: number
      name: string
      rank: { rank: number; type: number }
      transNames: any[]
    }
    blacklist: boolean
    eventCount: number
    identify: {
      actionUrl: string // 请求网易云音乐的链接
      imageDesc: string // 标签
      imageUrl: string // 标签图片
    }
    preferShow: number
    // 使用 Record<string, never> 代替 {} 避免空对象类型报错
    secondaryExpertIdentiy: Record<string, never>[]
    showPriMsg: boolean
    user: undefined | User
    videoCount: number
    // 使用 Record<string, never> 代替 {} 避免空对象类型报错
    vipRights: Record<string, never>
  }
  code: number
}
//用户详情信息类型定义 复用上面的Profile
interface GetUserDetailRes {
  code: number
  createDays: number
  createTime: number
  level: number // 等级
  profile: Profile //复用上面的
  userPoint: {
    balance: number
    blockBalance: number
    status: number
    updateTime: number
    userId: number
    version: number
  }
}
// 获取用户详情  通过指定的uid获取指定用户详情信息
export const getUserDetail = (uid: number) =>
  request.get<GetUserDetailRes>('/user/detail', { params: { uid } })

// 获取账号信息
export const getUserAccount = () => request.get<GetUserAccountRes>('/user/account')

// 获取歌手详情
export const getArtistDetail = (id: number) =>
  request.get<GetArtistDetailRes>('/artist/detail', { params: { id } })

// 获取用户绑定信息
export const getUserBinding = (uid: number) => request.post('/user/binding', { uid })
