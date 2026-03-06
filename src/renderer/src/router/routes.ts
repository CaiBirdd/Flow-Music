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
    path: '/user-record',
    name: 'userRecord',
    component: () => import('@/views/UserRecord/index.vue')
  }
]
