<!--  文件: index.vue
功能概述: 应用左侧侧边栏组件，渲染用户头像、用户歌单与侧边导航菜单，支持折叠子列表、右键上下文菜单、
创建歌单对话框与路由跳转（选择歌单/菜单项切换页面并携带 query id）。-->
<script setup lang="ts" name="BaseAside">
import { ref } from 'vue'
import { ListItem, needUseComparisonPaths } from '@/layout/BaseAside/config'
import { useUserInfo } from '@/store'
import { useMusicAction } from '@/store/music'
import { useFlags } from '@/store/flags'
import { useRoute, useRouter } from 'vue-router'

import ContextMenu from '@/components/ContextMenu/index.vue'
import SongListCreator from '../../components/SongListCreator/index.vue'
import { deletePlaylist } from '@/api/playlist'
import { getPlayListDetail, QueuePlaylist } from '@/api/musicList'
import { getUserPlayListFn } from '../../utils/userInfo'
import { ElMessage } from 'element-plus'
import Item from './item.vue'

const store = useUserInfo()
const musicStore = useMusicAction()
const flags = useFlags()
const router = useRouter()
const route = useRoute()

// 添加右键菜单配置
const playlistMenuItems = [
  { label: '播放', value: 'play' },
  { label: '删除此列表', value: 'delete' }
]
//删除歌单操作
const deletePlayHandler = async (item) => {
  try {
    await deletePlaylist([item.id])
    getUserPlayListFn()
    ElMessage.success('删除成功')
  } catch {
    ElMessage.error('删除失败')
  }
}
//右键菜单选择操作
const handlePlaylistMenuSelect = (
  item: { label: string; value: string },
  playlistItem: ListItem
) => {
  switch (item.value) {
    case 'play':
      // 跳转到该歌单详情页
      itemClick(playlistItem)
      // 将整个歌单加入播放队列并播放
      playWholeList(playlistItem.id as number)
      break
    case 'delete':
      // 从播放列表移除
      deletePlayHandler(playlistItem)
      break
  }
}

//播放整个歌单的逻辑
const playWholeList = async (id: number) => {
  //获取歌单详情（包含 trackIds 和 完整的 tracks）
  const { playlist } = await getPlayListDetail(id)
  //构造播放队列对象
  const list = {
    id: playlist.id,
    tracks: playlist.tracks
  }
  //更新全局播放队列
  musicStore.updatePlayQueue(
    list as QueuePlaylist,
    playlist.tracks.map((item) => item.id)
  )
  //立即播放第一首歌曲
  if (playlist.tracks.length > 0) {
    musicStore.getMusicUrlHandler(playlist.tracks[0])
  }
}
// 菜单项点击事件
const itemClick = (item: ListItem) => {
  // 极简实现：不管那么多，直接告诉路由我要去哪
  router.push({
    path: item.path,
    query: {
      id: item.id
    }
  })
}

//判断当前菜单项是否应该高亮
const isCurrent = (path: string, id?: number) => {
  //路径匹配 这里是不需要id的'/home', '/lately', '/cloud'
  if (needUseComparisonPaths.includes(path)) {
    return route.path === path
  }
  //'/play-list'其实就是歌单项 路径和菜单都对才可以
  return route.path === path && Number(route.query.id) === id
}
//跳转到用户详情页
const gotoDetail = () => {
  router.push({
    path: '/user-detail',
    query: {
      uid: store.profile.userId
    }
  })
}
//点击未登录头像 触发登录弹窗
const login = () => {
  flags.isOpenLogin = true
}
// 点击折叠/展开按钮 -> 切换 Store 状态
const collapsedHandler = (item) => {
  store.toggleCollapse(item.mark)
}
// 创建歌单弹窗控制
const dialog = ref(false)
const openDialog = () => {
  dialog.value = true
}
</script>

<template>
  <SongListCreator v-model="dialog" />
  <div class="aside">
    <!-- 头部：用户头像区域 -->
    <div class="avatar-box">
      <template v-if="store.isLogin">
        <div
          :style="{ backgroundImage: `url(${store.profile.avatarUrl})` }"
          class="head-portraits"
          @click="gotoDetail"
        ></div>
        <div class="nickname">{{ store.profile.nickname }}</div>
      </template>
      <div v-else class="not-login" @click="login">
        <el-icon :size="22"><User /></el-icon>
        <span>未登录</span>
      </div>
    </div>
    <!-- 主体：可滚动的菜单列表区域 -->
    <div class="play-container">
      <template v-for="(menuItem, i) in store.asideMenuConfig" :key="i">
        <!-- 每个 menuItem 代表一个大区块（如“创建的歌单”、“收藏的歌单”） -->
        <div
          v-if="menuItem.show"
          :class="['lump', { 'collapsed-lump': menuItem.type === 'collapsed' }]"
        >
          <!-- 区块标题栏 有折叠类型才能触发折叠函数 这里title只针对创建的歌单和收藏的歌单-->
          <div
            v-if="menuItem.title"
            class="title"
            @click="menuItem.type === 'collapsed' && collapsedHandler(menuItem)"
          >
            <span>{{ menuItem.title }}</span>
            <v-icon class="plus" icon="mdi-plus" @click.stop="openDialog" />
          </div>
          <!-- 分支 A：可折叠类型的区块 创建的歌单和收藏的歌单 -->
          <template v-if="menuItem.type === 'collapsed'">
            <!-- class 'expanded' 控制高度展开/收起 -->
            <div class="collapse-wrapper" :class="{ expanded: menuItem.isCollapsed }">
              <div class="collapse-inner">
                <!-- 遍历该区块下的所有子菜单项 (item) -->
                <template v-for="item in menuItem.list" :key="item.id">
                  <!-- 特殊处理：如果是“创建的歌单”(mark === 'play')，包裹右键菜单 -->
                  <ContextMenu
                    v-if="menuItem.mark === 'play'"
                    :items="playlistMenuItems"
                    @select="(menuItem) => handlePlaylistMenuSelect(menuItem, item)"
                  >
                    <!-- 菜单项组件 -->
                    <!-- :checked 绑定高亮状态 (Router 驱动) 这个是我创建的歌单-->
                    <Item
                      :item="item"
                      :checked="isCurrent(item.path, item.id)"
                      @click="itemClick"
                    />
                  </ContextMenu>
                  <!-- 其他列表(收藏歌单），目前没加右键菜单 -->
                  <Item
                    v-else
                    :item="item"
                    :checked="isCurrent(item.path, item.id)"
                    @click="itemClick"
                  />
                </template>
              </div>
            </div>
          </template>
          <!-- 分支 B：普通平铺区块（如“为我推荐”、“我的音乐”） -->
          <template v-else>
            <Item
              v-for="item in menuItem.list"
              :key="item.id"
              :item="item"
              :checked="isCurrent(item.path, item.id)"
              @click="itemClick"
            />
          </template>
        </div>
        <!-- 分割线：除了最后一个区块，每个区块下面画一条线 -->
        <div v-if="i < store.asideMenuConfig.length - 1 && menuItem.show" class="line"></div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* 折叠动画的核心实现*/
.collapse-wrapper {
  display: grid;
  grid-template-rows: 0fr; /* 默认状态：行高为 0 (收起) */
  transition: grid-template-rows 0.3s ease; /* 300ms 平滑过渡 */
  overflow: hidden; /* 隐藏超出部分 */
  /* 展开状态 */
  &.expanded {
    grid-template-rows: 1fr; /* 展开：行高为 1fr (自适应内容高度) */
  }
  /* 内部容器：必须指定 min-height: 0 才能让 Grid 动画生效 */
  .collapse-inner {
    min-height: 0;
  }
}
.aside {
  width: 235px;
  flex-shrink: 0; // 防止主内容区main挤压侧边栏aside
  height: 100%; //占满父容器高度
  background-color: rgba(255, 255, 255, 0.03); /* 极淡的半透明背景 */
  padding: 10px 0;
  box-sizing: border-box;
  position: relative;
  z-index: 100;
  overflow: hidden;
  .avatar-box {
    height: 80px;
    width: 100%;
    display: flex;
    align-items: center;
    padding: 0 25px;
    //justify-content: center;
    .head-portraits {
      border-radius: 50%;
      width: 40px;
      height: 40px;
      background: url('https://p1.music.126.net/siSjcSLr8ybRZ3VUpC-9hg==/109951165504329717.jpg'); /* 默认头像背景图 (网易云 CDN) */
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
      margin-right: 6px;
      cursor: pointer;
    }
    .not-login {
      display: flex;
      align-items: center;
      margin-right: 20px;
      cursor: pointer;
      .el-icon {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        width: 27px;
        height: 27px;
        margin-right: 7px;
      }
      > span {
        font-size: 12px;
        position: relative;
        top: -0.5px;
      }
    }
    .nickname {
      max-width: 140px; /* 限制最大宽度 */
      @include textOverflow(); /* 引入 Mixin 实现省略号 (...) */
      font-size: 14px;
    }
  }
  /* 菜单列表滚动容器 */
  .play-container {
    overflow-y: auto; /* 内容多了显示滚动条 */
    scrollbar-gutter: stable; /* 核心：预留滚动条坑位 要不然会挤压里面的内容导致布局跳动*/
    height: calc(100% - 70px); /* 减去头部高度 */
    padding: 0 14px 0 20px; // 上0 右14 下0 左20（下padding后面单独覆盖了）
    padding-bottom: 100px; /* 底部留白，防止最后一条被底部播放栏挡住 */
    /* 可折叠区块样式 */
    .collapsed-lump {
      /* 标题栏布局 */
      .title {
        display: flex;
        justify-content: space-between; /* 两端对齐：文字在左，加号在右 */
        cursor: pointer;
      }
    }
    /* 普通区块样式 */
    .lump {
      .title {
        font-size: 14px;
        color: $darkText; /* 使用全局变量颜色 */
        text-align: left;
        padding: 0 10px;
        margin-bottom: 5px;
        .plus {
          /* 加号图标样式 */
          border-radius: 50%;
          width: 18px;
          font-size: 14px;
          height: 18px;
          background-color: rgba(255, 255, 255, 0.1);
        }
      }
    }
    /* 分割线样式 */
    .line {
      height: 1px;
      background-color: rgba(255, 255, 255, 0.1);
      margin: 15px 10px;
    }
  }
}
</style>
