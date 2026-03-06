import request from '@/utils/request'
import { GetMusicDetailData } from '@/api/musicList'

//搜索结果类型接口
interface CloudSearch {
  code: number
  result: {
    searchQcReminder: null
    songCount: number // 搜索到了多少首歌
    songs: GetMusicDetailData[] // 具体的歌曲列表
  }
}
//搜索框的灰色提示
interface SearchDefaultRes {
  code: number
  data: {
    realkeyword: string // 真实的搜索词 (比如 "周杰伦")
    showKeyword: string // 展示给用户的文案 (比如 "听周杰伦的新歌")
  }
}

// 搜索
export const cloudSearch = (keywords: string, offset: number, limit: number, type = 1) =>
  request.post<CloudSearch>('/cloudsearch', { keywords, limit, offset, type })

// 热搜列表(详细)
export const searchHotDetail = () => request.post('/search/hot/detail')

// 搜索建议
export const searchSuggest = (keywords: string, type: 'mobile' | '' = '') =>
  request.post('/search/suggest', { keywords, type })

// 默认搜索关键词
export const searchDefault = () => request.post<SearchDefaultRes>('/search/default')
