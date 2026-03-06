<script setup lang="ts" name="Bottom">
// 这里定义了组件的插槽类型。
// Record<string, never> 是比 {} 更严格的空对象类型，表示 props 不包含任何属性。
defineSlots<{
  //定义了一个名为default的默认插槽
  default?: (props: Record<string, never>) => any
}>()
</script>

<template>
  <div class="bottom-container container">
    <slot></slot>
  </div>
</template>

<style lang="scss" scoped>
.container {
  height: 75px;
  border-top: rgb(59, 59, 62) 1px solid;
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 1999; // 层级很高，确保显示在大部分内容之上（但通常低于弹窗/遮罩）
  width: 100%;
}
.bottom-container {
  transition: 0.5s; //最开始进入底部组件不显示，播放后显示有动画效果
}
</style>
