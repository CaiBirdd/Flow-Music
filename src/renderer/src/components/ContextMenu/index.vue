<!-- 右键菜单 -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, useTemplateRef } from 'vue' // inject: 用来拿 App.vue 提供的那个全局管家
import { useContextMenu } from './useContextMenu'
// 从钩子中只取出 MENU_KEY，用来开锁
const { MENU_KEY } = useContextMenu()
//使用 inject 获取全局单例的菜单管理器 (activeMenu, setActiveMenu)
const menuManager = inject(MENU_KEY) as any
// 定义组件的 Props
// items: 菜单里要显示的选项列表，是一个数组
defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

//定义事件发送器，当用户点击某个菜单项时，会向父组件发送 'select' 事件
const emit = defineEmits(['select'])

const visible = ref(false) //控制菜单是否显示，true 为显示，false 为隐藏
const x = ref(0) // x, y: 记录鼠标点击位置的坐标，用于 CSS 绝对定位设置菜单出现的位置
const y = ref(0)
const menuRef = useTemplateRef<HTMLElement>('menuRef')
const menuId = ref(Symbol('menu-id')) //给当前的组件实例一个唯一的 id

//showMenu: 核心方法，当用户右键点击触发区域时调用
const showMenu = (e: any) => {
  // 阻止浏览器默认的右键菜单弹出
  e.preventDefault()
  //同样检查一下是否有别的菜单开着
  if (menuManager.activeMenu.value) {
    menuManager.setActiveMenu(null)
  }
  //捕获鼠标点击的屏幕坐标，赋值给 x, y
  x.value = e.clientX
  y.value = e.clientY
  //显示当前菜单
  visible.value = true
  //向全局管理器注册自己
  // "我是 menuId，如果你要关掉我，就调用我的 hideMenu 方法"
  menuManager.setActiveMenu({
    id: menuId.value,
    hideMenu
  })
}

const hideMenu = () => {
  visible.value = false
}
// handleSelect: 当用户点击菜单里的某一项时
const handleSelect = (item: any, event: any) => {
  //通知父组件
  emit('select', item)
  //关闭菜单项
  hideMenu()
  //阻止冒泡
  event.stopPropagation()
}
// 处理“点击空白处关闭菜单”
const handleClickOutside = (e: any) => {
  // 如果菜单是打开的 (menuRef 有值) 且 点击的目标不在菜单元素内部
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    hideMenu()
  }
}
// 组件挂载时：添加全局点击监听，用于检测“点击外部”
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  // 如果组件都要销毁了，发现全局管理器里记录的“当前菜单”还是我自己
  // 那必须得注销掉，不然全局管理器会持有一个已经不存在的组件引用
  if (menuManager.activeMenu.value?.id === menuId.value) {
    menuManager.setActiveMenu(null)
  }
})
</script>

<template>
  <!-- 如果把这个组件包在一个 <SongItem> 外面，那整个 SongItem 区域右键都会触发 showMenu -->
  <div class="context-menu-wrapper" @contextmenu="showMenu">
    <!-- 插槽：这里放原本要显示的内容（如歌曲列表项） -->
    <slot></slot>
  </div>
  <!-- Teleport: 将实际的弹出菜单传送到 body 标签下 -->
  <!-- 作用：打破父组件 overflow:hidden 的限制，让菜单能自由浮动在最上层 -->
  <teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
    >
      <!-- 循环渲染传入的 items 数组 -->
      <div
        v-for="(item, index) in items as any[]"
        :key="index"
        class="menu-item"
        @click="(e: any) => handleSelect(item, e)"
      >
        {{ item.label }}
      </div>
    </div>
  </teleport>
</template>

<style lang="scss" scoped>
/* 包装器：相对定位，填满父容器，确保右键响应区域正确 */
.context-menu-wrapper {
  position: relative;
  width: 100%;
}

/* 弹出的菜单本体 */
.context-menu {
  position: fixed;
  /*
   * backdrop-filter 性能优化:
   * 右键菜单是临时元素，降低blur值减少GPU开销
   */
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 6px;
  overflow: hidden;
  background-color: rgba(40, 40, 40, 0.7);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 6px 0;
  min-width: 120px;
  z-index: 99999; /* 确保层级极高，盖住一切 */
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  /* GPU加速 */
  transform: translate3d(0, 0, 0);
  will-change: opacity;
  contain: layout style paint;
}
/* 具体的每一个菜单项 */
.menu-item {
  padding: 4px 8px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}
</style>
