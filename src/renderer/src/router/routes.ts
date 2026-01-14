export default [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/play-list',
    name: 'playList',
    component: () => import('@/views/PlayList/index.vue')
  },
  {
    path: '/album-list',
    name: 'albumList',
    component: () => import('@/views/AlbumList/index.vue')
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchList/index.vue')
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/views/Home/index.vue')
  },
  {
    path: '/fm',
    name: 'fm',
    component: () => import('@/views/PrivateFm/index.vue')
  },
  {
    path: '/video',
    name: 'video',
    component: () => import('@/views/Video/index.vue')
  },
  {
    path: '/follow',
    name: 'follow',
    component: () => import('@/views/Follow/index.vue')
  },
  {
    path: '/local',
    name: 'local',
    component: () => import('@/views/Local/index.vue')
  },
  {
    path: '/lately',
    name: 'lately',
    component: () => import('@/views/LatelyPlay/index.vue')
  },
  {
    path: '/daily-recommend',
    name: 'dailyRecommend',
    component: () => import('@/views/DailyRecommend/index.vue')
  },
  {
    path: '/user-detail',
    name: 'userDetail',
    component: () => import('@/views/UserDetail/index.vue')
  },
  {
    path: '/cloud',
    name: 'musicCloud',
    component: () => import('@/views/MusicCloud/index.vue')
  },
  {
    path: '/singer-page',
    name: 'singerPage',
    component: () => import('@/views/SingerPage/index.vue')
  },
  {
    path: '/comment',
    name: 'comment',
    component: () => import('@/views/Comment/index.vue')
  },
  {
    path: '/setting',
    name: 'setting',
    component: () => import('@/views/Setting/index.vue')
  },
  {
    path: '/user-cover',
    name: 'userCover',
    component: () => import('@/views/UserCover/index.vue')
  }
]
