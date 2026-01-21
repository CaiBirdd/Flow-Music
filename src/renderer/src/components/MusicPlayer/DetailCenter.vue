<!-- 这是一个非常典型的 “哑组件” (Dumb Component)，
 它没有任何自己的状态（data），
 完全依赖父组件喂给它的 props 渲染，干活也是通过 emit 喊父组件去干
 负责 播放/暂停、切歌、切换循环模式。-->
<script setup lang="ts">
interface Props {
  isPlay: boolean
  orderStatusVal: number //播放模式是哪个
}
defineProps<Props>()
// 播放模式图标映射: 列表循环 | 随机 | 单曲循环
const orderStatus = ['icon-xunhuan', 'icon-suijibofang', 'icon-danquxunhuan']
// 定义该组件会向外触发的所有事件
const emit = defineEmits([
  'setOrderHandler', // 请求切换播放模式
  'cutSong', // 请求切换歌曲（true=下一首, false=上一首）
  'pause', // 请求暂停
  'play' // 请求播放
])
</script>

<template>
  <div class="center">
    <div class="cut-container">
      <svg
        style="width: 20px"
        :class="['icon', 'iconfont', orderStatus[orderStatusVal]]"
        aria-hidden="true"
        @click="emit('setOrderHandler')"
      >
        <use :xlink:href="'#' + orderStatus[orderStatusVal]"></use>
      </svg>
      <i class="iconfont cut icon-shangyishou" @click="emit('cutSong', false)"></i>
      <i v-show="isPlay" class="iconfont operation icon-Pause" @click="$emit('pause')"></i>
      <i v-show="!isPlay" class="iconfont operation icon-kaishi1" @click="$emit('play')"></i>
      <i class="iconfont cut icon-xiayishou" @click="emit('cutSong', true)"></i>
    </div>
  </div>
</template>

<style scoped lang="scss">
.center {
  color: rgb(212, 212, 212);
  width: 441px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;

  .cut-container {
    //width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    .icon {
      font-size: 18px;
    }
    .iconfont {
      cursor: pointer;
    }
    /* 关键布局：除了第一个图标，后面的每个图标都离前一个 35px */
    .iconfont + .iconfont {
      margin-left: 35px;
    }
    /* 悬停特效：除了中间那个圆圈按钮(operation)，其他按钮悬停变红 */
    .iconfont:not(.operation):hover {
      color: rgb(194, 58, 59);
    }
    /* 悬停特效：中间圆圈按钮悬停变亮一点的背景色 */
    .operation:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .cut {
      font-size: 18px;
    }
    /* 中间播放按钮的特殊样式：圆形背景 */
    .operation {
      //margin: 0 40px;
      color: $text;
      font-size: 18px;
      display: inline-block;
      width: 37px;
      line-height: 37px;
      text-align: center;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.05);
      /* 微调：播放图标因为是三角形，视觉重心偏左，所以要手动修正偏移量 */
      &::before {
        margin-left: 3px;
      }
    }
    /* 微调：暂停图标视觉修正 */
    .icon-Pause {
      font-size: 16px;

      &::before {
        margin-left: 1px;
      }
    }
  }
}
</style>
