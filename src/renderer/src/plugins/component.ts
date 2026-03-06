import Card from '@/components/Card/index.vue'
import { App } from 'vue'

const componentArr = [Card]

export default (app: App) => {
  componentArr.forEach((component) => {
    if (component.name) {
      app.component(component.name, component)
    }
  })
}
// 将一组常用 Vue 组件（ Card）批量注册为全局组件，方便在模板中直接使用而无需逐个局部注册
