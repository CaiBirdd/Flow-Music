import Card from '@/components/Card/index.vue'

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    Card: typeof Card
  }
}

export {}
// 用途：告诉 TypeScript/IDE，这些组件（BaseButton、Card）是全局可用的，模板里用它们不会报类型错误。
//效果：在模板里直接写 <BaseButton/> 时能获得自动完成和类型检查。
