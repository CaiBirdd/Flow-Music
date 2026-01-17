<script setup lang="ts">
interface Props {
  picUrl?: string // 图片地址
  name?: string // 卡片下方的文字标题
  isClick?: boolean // 是否可点击（控制鼠标手势 card-click 样式）
  isStartIcon?: boolean // 悬停是否显示“播放”图标
}
// 定义对外暴露的 click 事件
const emit = defineEmits(['click'])
//接收父组件传来的数据
const props = defineProps<Props>()
defineOptions({
  //全局注册需要这个
  name: 'Card'
})
//点击处理函数，抛出事件
const clickHandler = () => {
  emit('click')
}
</script>

<template>
  <!-- card-box: 外层容器，用于控制整体布局和宽度 -->
  <div class="card-box">
    <div
      :style="{ backgroundImage: `url(${props.picUrl}?param=400y400` }"
      :class="['card', { 'card-click': isClick }]"
      @click="clickHandler"
    >
      <!-- 插槽：允许父组件在图片上叠加其他内容（比如播放量数字、标签等） -->
      <slot></slot>
      <!-- 播放按钮遮罩层：只有当 isStartIcon 为 true 时才会渲染播放图标 -->
      <div v-if="isStartIcon" class="start-icon-box">
        <i class="iconfont operation icon-kaishi1"></i>
      </div>
    </div>
    <!-- 下方的文字标题 -->
    <span :class="['text', { 'card-click': isClick }]">{{ props.name }}</span>
  </div>
</template>

<style lang="scss" scoped>
.card-box {
  display: inline-block; // 让卡片横向排列
  margin-bottom: 20px;
  box-sizing: content-box;
  width: 190px;

  .card {
    height: 190px; // 正方形图片区域
    width: 190px;
    border-radius: 5px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: 0.3s;
    position: relative;
    .start-icon-box {
      position: absolute;
      bottom: 10px; //悬浮在右下角
      width: 50px;
      height: 50px;
      right: 10px;
      border-radius: 50%;
      background-color: rgb(255, 255, 255);
      opacity: 0; //默认全透明
      display: flex;
      align-items: center;
      justify-content: center;
      transition: 0.5s; // 显隐动画时间
      visibility: hidden; // 默认隐藏
      // 图标本身
      .icon-kaishi1 {
        color: $subject;
        font-size: 30px;
      }
    }
  }
  .card:hover {
    .start-icon-box {
      visibility: visible;
      opacity: 0.8;
    }
    box-shadow: 0 5px 15px 5px rgba(0, 0, 0, 0.1);
  }
  //可点击状态下的鼠标手势
  .card-click {
    cursor: pointer;
  }
  // 标题文字样式
  .text {
    margin-top: 5px;
    color: $text;
    font-size: 15px;
    @include textOverflow(2); //超过两行自动省略号
  }
}
</style>
