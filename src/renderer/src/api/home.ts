import request from '@/utils/request'
import type { GetMusicDetailData } from '@/api/musicList'

//轮播图类型定义 暂没用到
export type Banner = {
  encodeId: string
  imageUrl: string
  scm: string
  song: null
  targetId: number
  targetType: number
  titleColor: string // 右下角背景颜色
  typeTitle: string // 右下角文字
  url: string | null // 网页跳转链接，一般是商品之类的
}
interface BannerRes {
  code: number
  banners: Array<Banner>
}
//推荐歌单类型定义 暂没用到
interface PersonalizedRes {
  category: number
  code: number
  hasTaste: boolean
  result: Array<{
    alg: string
    canDislike: boolean
    copywriter: string
    highQuality: boolean
    id: number
    name: string // 歌单名称
    picUrl: string // 封面图片
    playCount: number // 播放次数
    trackCount: number // 歌单数量
    trackNumberUpdateTime: number // 歌单最后更新时间
    type: number
  }>
}
//每日推荐歌单类型定义 暂没用到
export interface Recommend {
  alg: string
  copywriter: ''
  createTime: number
  creator: {
    nickname: string
    userId: number
    avatarUrl: string
    userType: 4
    vipType: 11
  }
  id: number
  name: string
  picUrl: string
  playcount: number
  trackCount: number
  type: number
  userId: number
}
//每日推荐歌单类型定义 登录后
interface RecommendSongListRes {
  code: number
  featureFirst: boolean
  haveRcmdSongs: boolean
  recommend: Array<Recommend> // 包含推荐歌单列表
}
//每日推荐的歌曲类型定义 登录后
interface RecommendSongRes {
  code: number
  data: {
    dailySongs: GetMusicDetailData[]
    recommendReasons: Array<{
      reason: string
      songId: number
    }>
  }
}

// 获取轮播图
export const banner = () => request.get<BannerRes>('/banner')

// 获取推荐歌单
export const personalized = () => request.get<PersonalizedRes>('/personalized')

// 获取每日推荐歌单√
export const recommendSongList = () => request.get<RecommendSongListRes>('/recommend/resource')

// 获取每日推荐歌曲√
export const recommendSong = () => request.get<RecommendSongRes>('/recommend/songs')

// 获取首页数据
export const homepage = () => request.get('/homepage/block/page')

// 获取独家放送
export const privatecontent = () => request.get('/personalized/privatecontent/list')
