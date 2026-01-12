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
// 菜单项 = 基础菜单属性 + 部分歌单属性(Partial<PlaylistBase>)。

// 定义菜单组（Menu Group）的结构
export interface MenuConfig {
  // 区块标题。'false' 表示该区块没有标题（最顶部的“为我推荐”就没有标题栏）
  title: '我的音乐' | '创建的歌单' | '收藏的歌单' | false
  mark: 'my' | 'play' | 'subscribedList' | false //区块标识，用于代码区分
  list: ListItem[] //这个区块下的菜单列表
  show?: boolean // 控制该区块是否显示
  type?: 'collapsed' | 'tiled' //布局类型：'collapsed': 可折叠的 'tiled': 平铺的
  isCollapsed?: boolean //展开还是收起
}
// 全局统一侧边栏字体大小
export const asideFontSize = 14
// 需要高亮对比的路径
// 用于判断当前路由是否需要激活某个菜单项的高亮状态。
export const needUseComparisonPaths = ['/home', '/lately', '/cloud']
// 初始状态的侧边栏配置
// 这是一个对象数组，每一个对象代表一个“区块”。 store会加载这个初始配置，但在运行时会向里面填充动态数据
export const originAsideMenuConfig: MenuConfig[] = [
  {
    title: false,
    mark: false,
    show: true, //这边改不了，默认和修改后一直在，始终显示
    list: [
      {
        name: '为我推荐',
        icon: 'icon-home-fill',
        path: '/home',
        asideFontSize,
        id: 1 // 这里的 id 是为了配合列表渲染的 key，和歌单真实 ID 区分开
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
    isCollapsed: true, // 默认收起
    list: [] // 初始为空，等待接口数据填充
  },
  {
    title: '收藏的歌单',
    mark: 'subscribedList',
    type: 'collapsed',
    isCollapsed: true,
    list: []
  }
]
