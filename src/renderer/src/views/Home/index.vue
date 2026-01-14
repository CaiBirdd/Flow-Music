<script setup lang="ts" name="Home">
import { ref } from 'vue'
import type { TabsPaneContext } from 'element-plus'
import { tabsConfig } from './config'
import Individual from './components/individual.vue'
import SkeletonCard from '@/components/SkeletonCard/index.vue'

const activeName = ref(tabsConfig[0].name)

const handleClick = (tab: TabsPaneContext, event: Event) => {}
</script>

<template>
  <div class="padding-container">
    <Individual />
  </div>
</template>

<style lang="scss" scoped></style>
