<script setup lang="ts">
import { onMounted, ref, provide, useTemplateRef, watch } from 'vue'
import { useMusicAction } from '@/store/music'
import { getUserAccountFn } from '@/utils/userInfo'
import { useFlags } from '@/store/flags'
import Header from '@/layout/BaseHeader/index.vue'
import Aside from '@/layout/BaseAside/index.vue'
import Bottom from '@/layout/BaseBottom/index.vue'
import MusicDetail from '@/components/MusicDetail/index.vue'
import MusicPlayer, { MusicPlayerInstanceType } from '@/components/MusicPlayer/index.vue'
import Login from '@/components/Login/index.vue'
import { useUserInfo } from '@/store'
import PlayListDrawer from '@/components/PlayListDrawer/index.vue'
import '@/utils/shortcutKey'
import { useSettings } from '@/store/settings'
import { useContextMenu } from './components/ContextMenu/useContextMenu'

// 获取播放器组件的引用 (MusicPlayer 组件实例)
// 这个引用非常关键，用于将 audio 实例挂载到 window 对象上供全局调用
const audioInstance = useTemplateRef<MusicPlayerInstanceType>('audioInstance')

const music = useMusicAction()
const flags = useFlags()
const store = useUserInfo()
const settings = useSettings()
const refresh = ref(0) // 定义 refresh 变量，用于在登录状态变化时，通过 下面router-view中的 :key 强制重新渲染路由组件
store.loadCache() //从本地缓存加载用户信息（如 cookie）

//  初始化右键菜单逻辑，并通过 provide 注入到全局
// 任何子组件都可以通过 inject(MENU_KEY) 来调用右键菜单，无需层层传递 props
const { MENU_KEY, activeMenu, setActiveMenu } = useContextMenu()
provide(MENU_KEY, { activeMenu, setActiveMenu })
//onMounted 生命周期：组件挂载完成后的初始化工作
onMounted(() => {
  // [核心逻辑]将播放器实例挂载到 window.$audio
  // 这样在非 Vue 组件的代码（如纯 TS 工具函数）里也能控制播放/暂停
  // 组件挂载完之后，audioInstance.value 就有值了
  if (audioInstance.value !== undefined) {
    window.$audio = audioInstance.value!
    console.log('初始化全局$audio：', window.$audio)
  }
  // 全局点击监控：点击任意位置关闭“播放列表抽屉”
  document.addEventListener('click', () => {
    flags.isOpenDrawer = false
  })
  //初始化主题：检测是否开启“粗体模式”，给 body 添加类名
  if (settings.state.bold) {
    document.body.classList.add('bold')
  }
})
// 监听登录状态变化
// 当用户登录/登出时，refresh + 1，强制 <router-view> 重新渲染，确保页面数据刷新
watch(
  () => store.isLogin,
  () => {
    refresh.value = refresh.value + 1
  }
)
// 调用获取用户信息的接口（如果本地有 cookie，尝试换取用户信息）
getUserAccountFn()
</script>

<template>
  <!-- 局背景层 -->
  <div id="opacity-bg0" style="position: fixed; width: 100%; height: 100%; transition: 0.5s"></div>
  <div id="opacity-bg1" style="position: fixed; width: 100%; height: 100%; transition: 0.5s"></div>
  <!--  歌曲详情页和播放列表抽屉 -->
  <MusicDetail />
  <PlayListDrawer />
  <!-- 主界面容器 -->
  <div style="height: 100%; position: relative; z-index: auto">
    <div id="box">
      <Aside></Aside>
      <div class="main">
        <Header></Header>
        <div class="body">
          <!-- router-view这里用插槽是为了把组件对象暴露出来 -->
          <router-view v-slot="{ Component }">
            <component :is="Component" :key="refresh"></component>
          </router-view>
        </div>
      </div>
    </div>
    <!-- 底部垫高层：防止内容被底部播放栏遮挡 -->
    <div style="height: 20px"></div>
  </div>
  <!-- 底部播放栏容器根据是否有音乐 URL (musicUrl.length) 决定是显示(.bottom-show) 还是隐藏(.bottom-visible)
   插槽是Bottom组件的-->
  <Bottom :class="[music.state.musicUrl.length ? 'bottom-show' : 'bottom-visible']">
    <template #default>
      <teleport :disabled="!flags.isOpenDetail" to=".music-detail-container .music-detail-bottom">
        <MusicPlayer
          ref="audioInstance"
          :current-song="music.state?.currentSong"
          :src="music.state.musicUrl"
        ></MusicPlayer>
      </teleport>
    </template>
  </Bottom>
  <Login></Login>
</template>

<style lang="scss">
.bottom-show {
  visibility: visible;
  opacity: 1;
}
.bottom-visible {
  visibility: hidden;
  opacity: 0;
}
</style>
