<!-- 功能: 列表项组件，用于侧边栏播放列表或歌单项，显示图标或封面、名称，并在被点击时通知父组件。 -->
<script setup lang="ts">
interface Props {
  item: any
  checked: boolean
}
defineProps<Props>()
const emit = defineEmits(['click'])
</script>

<template>
  <div
    :style="{ fontSize: item.asideFontSize + 'px' || '' }"
    :class="['play-list-item', { current: checked }]"
    @click="emit('click', item)"
  >
    <i v-if="item.icon" :class="['iconfont', item.icon || '']"></i>
    <img v-else-if="item.coverImgUrl" :src="item.coverImgUrl + '?param=150y150'" alt="" />
    <span class="name">{{ item.name }}</span>
  </div>
</template>

<style lang="scss" scoped>
.play-list-item {
  cursor: pointer;
  color: $text;
  font-size: 13px;
  text-align: left;
  line-height: 40px;
  @include textOverflow();
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
  .name {
    margin-left: 10px;
    @include textOverflow();
  }
}
.play-list-item:hover {
  background-image: linear-gradient(to right, rgba(255, 17, 104, 0.8), rgba(252, 61, 73, 0.3));
}
.current.play-list-item {
  background-image: linear-gradient(to right, rgba(255, 17, 104, 0.8), rgba(252, 61, 73, 0.7));
}
</style>
