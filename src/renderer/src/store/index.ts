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
      volume: Number(localStorage.getItem('volume')) || 1, // 用户当前播放器音量
      collapsedState: JSON.parse(localStorage.getItem('ASIDE_COLLAPSED') || '{}') as Record<
        string,
        boolean
      > //侧边折叠状态 在代码最后有补充
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

      // 应用折叠状态
      if (typeof createdBlock.isCollapsed === 'boolean') {
        // 如果本地有记录，用记录的；没记录用默认的(config里默认是true)
        if (state.collapsedState.play !== undefined) {
          createdBlock.isCollapsed = state.collapsedState.play
        }
      }
      if (typeof subscribedBlock.isCollapsed === 'boolean') {
        if (state.collapsedState.subscribedList !== undefined) {
          subscribedBlock.isCollapsed = state.collapsedState.subscribedList
        }
      }

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
      //遍历属性，将传入的 val 赋值给 state.profile 相当于填表哈哈哈
      //typeof val拿到val的数据结构 keyof是提取这个结构的所有键名
      type key = keyof typeof val
      for (const valKey in this.profile) {
        this.profile[valKey as key] = val[valKey as key]
      }
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
    // 更新红心歌曲ID列表
    updateUserLikeIds(ids: number[]) {
      this.userLikeIds = ids
    },
    // 异步 Action: 刷新用户红心歌曲列表 (Consolidated Refresh Logic)
    async refreshLikedSongs() {
      if (!this.isLogin || !this.profile.userId) return
      try {
        const { ids } = await getLikeMusicListIds(this.profile.userId)
        if (ids?.length) {
          this.updateUserLikeIds(ids)
        }
      } catch (error) {
        console.error('刷新红心歌曲列表失败:', error)
      }
    },
    // 切换折叠状态 这里是根据mark来的，去看layout/BaseAside/config
    toggleCollapse(mark: string) {
      // 1. 先去 Getter 算出来的菜单里找一下这个块
      const target = this.asideMenuConfig.find((item) => item.mark === mark)
      // 2. 确认它支持折叠 (isCollapsed 是布尔值)
      if (target && typeof target.isCollapsed === 'boolean') {
        const newVal = !target.isCollapsed //取反
        // 4. 更新 state.collapsedState
        // 比如：this.collapsedState['play'] = false
        // 注意：一旦这里改了 State -> Getter 监听到 State 变了 -> 自动触发重算 -> 菜单状态更新 -> 界面刷新
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
新用户安装后第一次打开：LocalStorage 里啥也没有 (null)，所以 || '{}' 生效，初始值就是 {}。
这时候 Getter 去读字典，读出来是 undefined。
Getter 就说：“既然你没记过，那我就听 config.ts 里的默认配置（默认这两个都是折叠的）”。
用户点了一下展开后：State 变成了 {"play": false}，并且同步存入了 LocalStorage。
下次刷新回来，初始值就不是空对象了，而是从本地读出来的 {"play": false}。
Getter 再去读，发现有记录了，就优先听记录的，把菜单展开。
*/
