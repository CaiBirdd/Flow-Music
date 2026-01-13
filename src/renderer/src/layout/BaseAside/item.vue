<!-- 功能: 列表项组件，用于侧边栏播放列表或歌单项，显示图标或封面、名称，并在被点击时通知父组件。
 只负责渲染 渲染侧边栏中所有的行 业务逻辑交给父组件 -->
<script setup lang="ts">
interface Props {
  item: any //类型any的原因是，这块既可能是系统菜单配置config.ts，也可能是歌单项
  checked: boolean //高亮状态
}
defineProps<Props>()
const emit = defineEmits(['click'])
</script>

<template>
  <!-- 监听原生点击事件click，触发自定义的click事件，并把这行的数据item作为参数抛给父组件 -->
  <div
    :style="{ fontSize: item.asideFontSize + 'px' || '' }"
    :class="['play-list-item', { current: checked }]"
    @click="emit('click', item)"
  >
    <!-- 如果有 icon 字段，说明是“系统菜单”（如最近播放）。直接渲染字体图标。 -->
    <i v-if="item.icon" :class="['iconfont', item.icon || '']"></i>
    <!-- 如果有 coverImgUrl 字段，说明是具体歌单项，渲染封面图。 -->
    <img v-else-if="item.coverImgUrl" :src="item.coverImgUrl + '?param=150y150'" alt="" />
    <!-- 文字内容 -->
    <span class="name">{{ item.name }}</span>
  </div>
</template>

<style lang="scss" scoped>
/* 列表项基础样式 */
.play-list-item {
  cursor: pointer;
  color: $text;
  font-size: 13px;
  text-align: left;
  line-height: 40px;
  @include textOverflow(); //文本溢出
  padding: 0 10px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  margin: 7px 0;
  > img {
    width: 34px;
    height: 34px;
    border-radius: 6px;
  }
  /* 针对内部文字名称的样式 */
  .name {
    margin-left: 10px; /* 文字距离左边的图标/图片 10px 间距 */
    @include textOverflow(); /* 这里再次使用溢出处理，双重保险 */
  }

  &:hover {
    background-image: linear-gradient(to right, rgba(255, 17, 104, 0.8), rgba(252, 61, 73, 0.3));
  }
  /* 交互状态：选中高亮 (Active/Current) */
  /* 当组件被加上 .current 类名时生效 */
  &.current {
    background-image: linear-gradient(to right, rgba(255, 17, 104, 0.8), rgba(252, 61, 73, 0.7));
  }
}
</style>
