import { defineStore } from 'pinia'
import { Profile } from '@/api/user'
import { PlaylistBase, getLikeMusicListIds } from '@/api/musicList'
import { asideFontSize, MenuConfig, originAsideMenuConfig } from '@/layout/BaseAside/config' //引入侧边栏配置相关的类型和初始数据
import { useAnonymousLogin } from '@/utils/useLogin' //引入匿名登录工具函数（当用户信息失效时自动走游客登录）
import { useMusicAction } from './music' //引入音乐播放器的 Store，在恢复缓存时需要顺便把播放器状态也恢复了
import { useFlags } from './flags'
export const useUserInfo = defineStore('userInfoId', {
  state: () => {
    return {
      profile: {
        avatarUrl: '', // 用户头像
        backgroundUrl: '', // 用户背景图片
        nickname: '', // 用户昵称
        createTime: null as null | number,
        vipType: null as null | number,
        userId: null as null | number // 用户id
      },
      isLogin: false, // 是否登录
      userPlayListInfo: [] as PlaylistBase[], // 用户歌单列表信息 存储用户所有的歌单数据（API 返回的原始列表）
      userLikeIds: [] as number[], // 用户喜欢列表ids
      volume: Number(localStorage.getItem('volume')) || 0.5, // 用户当前播放器音量
      collapsedState: JSON.parse(localStorage.getItem('ASIDE_COLLAPSED') || '{}') as Record<
        string,
        boolean
      > //侧边折叠状态 键名键值对象
    }
  },
  getters: {
    asideMenuConfig(state): MenuConfig[] {
      // 这里的逻辑就是之前的 updateUserPlayList 里的拼装逻辑
      // 每次 state.userPlayListInfo 或 state.isLogin 变化，这里都会自动重新计算

      // 1. 深拷贝初始配置，确保不污染原始数据
      const menuConfig: MenuConfig[] = JSON.parse(JSON.stringify(originAsideMenuConfig))

      // 2. 找到 'my' (我的) // 'play' (创建的) // 'subscribedList' (收藏的) 三个区块的指针
      const myBlock = menuConfig.find((item) => item.mark === 'my')!
      const createdBlock = menuConfig.find((item) => item.mark === 'play')!
      const subscribedBlock = menuConfig.find((item) => item.mark === 'subscribedList')!

      // 重构注：这里删除了之前手动同步 isCollapsed 的逻辑
      // 现在 UI 组件会直接读取 state.collapsedState 来决定是否折叠，Getter 只负责生成菜单数据结构。

      // 3. 遍历歌单数据进行分类 自建的、红心、收藏的
      //这里相当于对红心歌单优待了下，给单独拿出来了
      state.userPlayListInfo.forEach((item) => {
        if (item.subscribed) {
          // 收藏的歌单
          subscribedBlock.list.push({ ...item, asideFontSize, icon: '', path: '/play-list' })
        } else {
          // 自建的歌单
          if (item.specialType === 5) {
            // 是【我喜欢的音乐】(红心歌单)，插队到 'my' 区块头部
            // 先看是否已经存在（防重复）
            const exists = myBlock.list.some((l) => l.name === '我喜欢的音乐')
            if (!exists) {
              myBlock.list.unshift({
                ...item,
                name: '我喜欢的音乐',
                asideFontSize,
                path: '/play-list',
                icon: 'icon-aixin'
              })
            }
          } else {
            // 普通自建歌单
            createdBlock.list.push({
              ...item,
              name: item.name,
              icon: '',
              asideFontSize,
              path: '/play-list'
            })
          }
        }
      })

      // 5. 根据登录状态控制区块显隐
      // 如果已登录，显示所有区块；未登录则隐藏需要数据的区块 if循环是排除为我推荐 登录后为其他每一项添加show=true
      //typeof item.mark先看前面
      menuConfig.forEach((item) => {
        if (typeof item.mark !== 'boolean') {
          item.show = state.isLogin
        }
      })

      return menuConfig
    }
  },
  actions: {
    // 更新用户信息（登录后调用）
    updateProfile(val: Profile) {
      if (!val || !val.userId) {
        // 打开登录弹窗，并重置 Store，尝试走匿名登录
        const flags = useFlags()
        flags.isOpenLogin = true
        this.$reset()
        useAnonymousLogin()
        return
      }
      // 直接使用 Object.assign 合并属性，比手写循环更简洁且能覆盖所有字段
      Object.assign(this.profile, val)
      // 持久化：将关键信息写入 localStorage，以便刷新页面后不丢失
      localStorage.setItem('userId', String(this.profile.userId))
      this.isLogin = true
      localStorage.setItem('IS_LOGIN', JSON.stringify(true))
      localStorage.setItem('PROFILE', JSON.stringify(this.profile))
    },
    // Action: 更新用户歌单列表
    // 现在变得非常纯粹：只负责接收数据
    updateUserPlayList(val: PlaylistBase[]) {
      this.userPlayListInfo = val //歌单数据存入state，存完后state.userPlayListInfo变了，会触发Getter计算侧边菜单
    },
    // 异步 Action: 刷新用户红心歌曲列表
    // 合并了之前的 updateUserLikeIds，直接在这里处理数据拉取和状态更新
    async refreshLikedSongs() {
      if (!this.isLogin || !this.profile.userId) return
      try {
        const { ids } = await getLikeMusicListIds(this.profile.userId)
        if (ids?.length) {
          this.userLikeIds = ids
        }
      } catch (error) {
        console.error('刷新红心歌曲列表失败:', error)
      }
    },
    // 切换折叠状态
    toggleCollapse(mark: string) {
      // 1. 获取目标配置项以确认默认状态
      const target = this.asideMenuConfig.find((item) => item.mark === mark)

      if (target && typeof target.isCollapsed === 'boolean') {
        // 2. 计算当前状态：优先取 state 里的记录，没有记录则取配置默认值
        const currentVal = this.collapsedState[mark] ?? target.isCollapsed

        // 3. 取反得到新状态
        const newVal = !currentVal

        // 4. 更新 State 和 LocalStorage
        this.collapsedState[mark] = newVal
        localStorage.setItem('ASIDE_COLLAPSED', JSON.stringify(this.collapsedState))
      }
    },

    // 核心初始化 Action：从缓存加载所有数据
    loadCache() {
      // 检查是否登录过
      const isLogin = JSON.parse(localStorage.getItem('IS_LOGIN') || 'false')
      if (!isLogin) {
        return // 没登录就不用恢复了
      }
      this.isLogin = true

      // 恢复用户信息
      const profile = localStorage.getItem('PROFILE')
      if (profile) {
        this.profile = JSON.parse(profile)
      }

      // 顺便恢复音乐播放器的状态
      //这样用户刷新页面后，当前播放列表、播放进度还能保持原样
      const music = useMusicAction()
      const musicConfig = localStorage.getItem('MUSIC_CONFIG')
      if (musicConfig) {
        music.updateState(JSON.parse(musicConfig))
      }
    }
  }
})

/*collapsedState 存的就是一个极简的 Key-Value 字典对象，用来记录谁被折叠了。
{
  "play": false,          // "创建的歌单" (mark='play') -> false (展开)
  "subscribedList": true  // "收藏的歌单" (mark='subscribedList') -> true (折叠)
}
{
  [key: string]: boolean
}
第一次打开 App：LocalStorage 是空的 -> collapsedState 是 {}。
Vue组件会发现字典里没这个 Key，于是去用默认配置 menuItem.isCollapsed（默认收起）。
你点了一下展开：代码会往字典里写入 "play": false 并存入
下次打开 App：从 LocalStorage 读出来的就是 {"play": false}。
Vue组件发现字典里有 play: false，于是优先用它，菜单就保持展开了。
*/
