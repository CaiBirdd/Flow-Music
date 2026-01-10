import { PlaylistBase } from '@/api/musicList'

// 定义所有的路由路径白名单
export const paths = ['/home', '/lately', '/play-list', '/cloud']
// 定义每个菜单项（每一行）的结构
export type ListItem = {
  name: string
  icon: string
  path: (typeof paths)[number]
  asideFontSize?: number
} & Partial<PlaylistBase> // 这里混入 PlaylistBase 类型是因为歌单项也是菜单项，而歌单有很多额外属性（如封面图、ID等）
// 定义菜单组（Menu Group）的结构
export interface MenuConfig {
  title: '我的音乐' | '创建的歌单' | '收藏的歌单' | false
  mark: 'my' | 'play' | 'subscribedList' | false
  list: ListItem[]
  show?: boolean
  type?: 'collapsed' | 'tiled'
  isCollapsed?: boolean
}
// 全局统一侧边栏字体大小
export const asideFontSize = 14
// 需要高亮对比的路径
// 用于判断当前路由是否需要激活某个菜单项的高亮状态。
export const needUseComparisonPaths = ['/home', '/lately', '/cloud']
// 初始状态的侧边栏配置
// 这是一个数组，每一个对象代表一个“区块”。
export const originAsideMenuConfig: MenuConfig[] = [
  {
    title: false,
    mark: false,
    show: true,
    list: [
      {
        name: '为我推荐',
        icon: 'icon-home-fill',
        path: '/home',
        asideFontSize,
        id: 1
      }
    ]
  },
  {
    title: false,
    mark: 'my',
    list: [
      {
        name: '最近播放',
        icon: 'icon-zuijinlaifang',
        path: '/lately',
        asideFontSize,
        id: 6
      },
      {
        name: '音乐云盘',
        icon: 'icon-headphone-fill',
        path: '/cloud',
        asideFontSize,
        id: 7
      }
    ]
  },
  {
    title: '创建的歌单',
    mark: 'play',
    type: 'collapsed',
    isCollapsed: true,
    list: []
  },
  {
    title: '收藏的歌单',
    mark: 'subscribedList',
    type: 'collapsed',
    isCollapsed: true,
    list: []
  }
]
