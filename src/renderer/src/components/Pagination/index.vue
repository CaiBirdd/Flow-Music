<!-- 封装 Vuetify 的 v-pagination，保持原有 Props 接口兼容 -->
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  total: number // 数据总条数（例如 100 首歌）
  pageSize: number // 每页显示多少条（例如 20）
  currentPage: number // 当前第几页
}

const props = defineProps<Props>()
const emit = defineEmits(['current-change', 'update:currentPage'])

// 计算总页数
const length = computed(() => Math.ceil(props.total / props.pageSize) || 0)

// 中转 v-model
const page = computed({
  get: () => props.currentPage,
  set: (val) => {
    emit('update:currentPage', val)
    emit('current-change', val)
  }
})
</script>

<template>
  <div class="box">
    <v-pagination
      v-model="page"
      :length="length"
      :total-visible="5"
      rounded="0"
      variant="text"
      density="compact"
    ></v-pagination>
  </div>
  <!--  variant="text" 纯文本样式（无边框、无背景），只有字 
    density="compact": 紧凑模式，按钮更小，间距更窄-->
</template>

<style lang="scss" scoped>
.box {
  display: flex;
  justify-content: center;
  padding: 10px 0;
}
</style>
