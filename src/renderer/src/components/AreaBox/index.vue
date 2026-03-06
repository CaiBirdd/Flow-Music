<!-- 一个带左右箭头的横向滚动容器组件 -->
<script lang="ts" setup>
import { onMounted, onUpdated, ref, useTemplateRef } from 'vue'

// Vue 3.5+ useTemplateRef 获取模板引用
const content = useTemplateRef<HTMLDivElement>('content')
const rightDisabled = ref(false)
const leftDisabled = ref(true) //左箭头初始禁用

//  更新箭头状态的函数  每次滚动或内容更新时都会调用它来计算当前位置
const updateButtonState = () => {
  // 如果 DOM 还没渲染好，直接返回，防止报错
  if (!content.value) return
  // 解构获取三个关键的滚动属性：
  // scrollLeft: 已经向左滚动的距离
  // scrollWidth: 内容的总宽度（包括不可见部分）
  // clientWidth: 容器的可视宽度
  const { scrollLeft, scrollWidth, clientWidth } = content.value
  // 左侧是否到底： 如果 scrollLeft 小于等于 0，说明在最左边，禁用左箭头
  leftDisabled.value = scrollLeft <= 0
  // 右侧是否到底：scrollLeft + clientWidth ≈ 总宽度
  // 这里用了 Math.ceil 向上取整
  rightDisabled.value = Math.ceil(scrollLeft + clientWidth) >= scrollWidth
}

// 点击左右箭头的处理函数
const moveHandler = (direction: 'left' | 'right') => {
  // 确保容器存在
  if (content.value) {
    // 获取当前可视区域的宽度，作为每次滚动的距离
    // 这样每次点击刚好滚动一页
    const containerWidth = content.value.clientWidth // 可视区域宽度

    // 使用原生 scrollBy 配合 CSS scroll-snap 实现吸附和整页/整块滚动
    content.value.scrollBy({
      // 向右点：正数（向右滚）；向左点：负数（向左滚）
      left: direction === 'right' ? containerWidth : -containerWidth,
      behavior: 'smooth' // 平滑滚动动画
    })
  }
}

// 挂载时检查一次状态（应对内容不足不需要滚动的情况）
onMounted(() => {
  updateButtonState()
})

// 使用 onUpdated 钩子：当组件更新（包括插槽内容变化）时重新检查按钮状态
// 这确保了异步数据加载后，箭头能正确显示
onUpdated(() => {
  updateButtonState()
})
</script>

<template>
  <div class="area-box">
    <!-- 头部区域 标题+右箭头-->
    <div class="head">
      <div class="title">
        <span style="cursor: pointer">
          <slot name="title"></slot>
          <el-icon style="position: relative; top: 1px" :size="16"><ArrowRightBold /></el-icon>
        </span>
        <div class="move-container">
          <div
            :class="['left', 'move', leftDisabled ? 'disabled' : '']"
            @click="moveHandler('left')"
          >
            <el-icon :size="20"><ArrowLeft /></el-icon>
          </div>
          <div
            :class="['right', 'move', rightDisabled ? 'disabled' : '']"
            @click="moveHandler('right')"
          >
            <el-icon :size="20"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>
    <!-- 容滚动区域 -->
    <!-- ref="content": 绑定到 script 中的 content 变量 -->
    <!-- @scroll="updateButtonState": 监听原生滚动事件，滚动时实时计算箭头状态 -->
    <div ref="content" class="content" @scroll="updateButtonState">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.area-box {
  margin-top: 20px;
  position: relative; // 相对定位，方便内部绝对定位元素

  .head {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    .title {
      width: 100%;
      display: flex;
      justify-content: space-between; // 两端对齐：标题在左，按钮组在右
      align-items: center;
      font-size: 18px;
      .move-container {
        display: flex;
        gap: 10px;
        .move {
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: color 0.5s; // 颜色过渡效果
          border-radius: 50%; // 圆形按钮
          color: rgba(255, 255, 255, 0.5); // 默认半透明白
          background-color: rgba(255, 255, 255, 0.1); // 背景微透
          padding: 3px;
          &:hover {
            color: $text; // 悬停高亮
          }
        }
        // 禁用状态样式
        .move.disabled {
          cursor: auto; // 鼠标变回默认箭头
          color: rgba(255, 255, 255, 0.1); // 颜色变得更暗，表示不可点
        }
        .left {
          left: -45px;
        }
        .right {
          right: -45px;
        }
      }
    }
  }
  .content {
    display: flex; // 让子元素卡片横向排列
    overflow-x: auto; // 允许横向滚动
    overflow-y: hidden; // 禁止纵向滚动
    column-gap: 20px; // 子元素之间的间距

    // 下面两段是用于隐藏浏览器的默认滚动条，为了美观
    &::-webkit-scrollbar {
      display: none;
    }
    scrollbar-width: none;

    // CSS Scroll Snap 核心
    scroll-snap-type: x mandatory; // 强制吸附
    scroll-behavior: smooth; // 平滑滚动

    // 使用 :deep(*) 穿透选择器，选中插槽里传进来的所有子组件
    :deep(*) {
      // 告诉浏览器，当滚动停止时，这个子元素的"开始位置(start)"
      // 应该与容器的边缘对齐
      scroll-snap-align: start; // 滚动停止时对齐到元素开头
    }
  }
}
</style>
