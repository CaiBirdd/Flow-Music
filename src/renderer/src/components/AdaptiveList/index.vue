<!-- 一个自适应网格列表容器 它的核心作用是利用 CSS Grid 布局的特性，让内部的卡片（也就是插槽里的内容）根据屏幕宽度自动排列，无需编写复杂的 JS 媒体查询。-->
<script setup lang="ts">
import type { StyleValue } from 'vue' //StyleValue 用于定义样式对象的类型

interface Props {
  AdaptiveStyle?: StyleValue // 允许父组件传入额外的自定义样式对象，覆盖或添加默认样式
  loading: boolean // loading 状态，用于控制 Element Plus 的 v-loading 加载动画显示
}
defineProps<Props>()
</script>

<template>
  <!-- 
    根容器 div
    v-loading="loading": 绑定 Element Plus 的加载指令，loading 为 true 时显示转圈圈
    :style="props.AdaptiveStyle": 应用父组件传进来的额外样式
    class="play-list": 应用本组件的核心网格布局样式
  -->
  <div v-loading="loading" :style="AdaptiveStyle" class="play-list">
    <!-- 默认插槽：父组件可以在这里放入任意数量的列表项（如歌单卡片） -->
    <!-- 这些插槽内容会自动成为 grid 布局的子项，按规则排列 -->
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.play-list {
  padding-top: 15px;
  display: grid; // [核心] 启用 Grid 网格布局
  // space-between: 如果一行没填满但也不够放下一个，剩下的元素会两端对齐
  // 注意：在 grid-template-columns 设置为 auto-fill 且宽度固定的情况下，
  // 这个属性其实在最后一行可能不会生效，主要还是靠 gap 控制间距
  justify-content: space-between;
  gap: 15px; // 设置网格行与列之间的间距都是 15px 简写属性，等同于 row-gap: 15px; column-gap: 15px;

  // [最核心的一行代码] 实现响应式自适应布局
  // repeat: 重复生成列
  // auto-fill: 自动填充模式。浏览器会计算容器每一行能放下多少个 190px 的元素
  //            如果容器宽 800px，就自动放 4 个；宽 400px，就自动放 2 个
  // 190px: 也就是每个子元素（卡片）的固定宽度
  // 总结：不需要写 @media 媒体查询，列数会随页面宽度自动增减
  grid-template-columns: repeat(auto-fill, 190px);
  :deep(.el-loading-mask) {
    // 穿透 Element Plus 的 loading 遮罩层样式
    background: transparent; // 将遮罩层背景设为透明 这样加载时只有中间转圈圈，不会有一层白蒙蒙盖住原来的内容
  }
}
</style>
