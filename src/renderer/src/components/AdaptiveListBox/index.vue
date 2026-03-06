<script setup lang="ts">
import type { StyleValue } from 'vue' // 引入 Vue 的样式类型定义
// 作用：这是一个给内容提供 统一背景、圆角、阴影 的容器外壳
interface Props {
  isShowBg?: boolean // 控制是否显示半透明背景色，默认为 true
  listStyle?: StyleValue // 允许父组件覆盖或添加样式（例如修改 padding 或 margin）
}
//响应式 Props 解构 (Reactive Props Destructure) 功能 能在解构时直接赋默认值
const { isShowBg = true, listStyle } = defineProps<Props>()
</script>

<template>
  <div :style="listStyle" :class="['list-container', { bg: isShowBg }]">
    <!-- 插槽：用于放置真正的内容，比如 AdaptiveList -->
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.list-container {
  padding: 20px; // 内部留白，让内容不贴边
  border-radius: 20px; // 大圆角设计，看起来更圆润
  width: calc(93vw - 180px);
  margin: 30px auto;
  box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.1); // 盒子阴影：稍微浮起的效果，增加层次感
  transition: 0.3s; // 过渡动画：如果宽高等属性变化，会有 0.3s 的平滑过渡
  &.bg {
    background-color: rgba(
      255,
      255,
      255,
      0.05
    ); // 淡淡的半透明白色背景，营造"毛玻璃"或者是卡片容器的感觉
  }
}
</style>
