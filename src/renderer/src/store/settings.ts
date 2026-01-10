import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setBaseURL } from '@/utils/request'

const USER_SETTINGS = 'USER_SETTINGS'

// 定义状态接口
interface SettingsState {
  baseUrl: string
  lyricBg: 'rgb' | 'rhythm'
  bold: true
  font: string
}
export const useSettings = defineStore('settingsId', () => {
  const state = ref<SettingsState>({
    baseUrl: import.meta.env.VITE_URL, // 默认 API 地址从 .env 文件读取
    lyricBg: 'rhythm',
    bold: true,
    font: 'Helvetica, Avenir, Arial, sans-serif'
  })
  // 深拷贝一份 state 的初始值，用于后续的“重置设置”功能
  const initialState = JSON.parse(JSON.stringify(state.value))
  // 定义 $reset 方法：调用 setState 并传入初始值，从而恢复默认设置
  const $reset = () => setState(initialState)
  //Partial使类型的所有属性可选
  const setState = (values?: Partial<SettingsState>) => {
    // Object.assign 将传入的新值合并到当前 state 中
    Object.assign(state.value, values)
    //持久化存储 将最新的 merge 后的 state 存入 localStorage
    localStorage.setItem(
      USER_SETTINGS,
      JSON.stringify({
        ...state.value, // 保留原有值
        ...values // 覆盖新值 把新传进来的对象铺在上面。如果有重名的属性，后面的会覆盖前面的。
      })
    )
    // 如果此次修改包含 baseUrl，需要同步更新 axios 的请求配置
    values?.baseUrl && setBaseURL(values.baseUrl)
  }
  // getState 方法：用于在应用启动时从 localStorage 恢复设置
  const getState = () => {
    const store = localStorage.getItem(USER_SETTINGS)
    if (store) {
      try {
        const parsedStore: Partial<SettingsState> = JSON.parse(store) //解析 JSON 字符串
        // 立即生效字体设置：直接操作 DOM 修改 id 为 app 的元素的字体
        ;(document.querySelector('#app') as HTMLDivElement)!.style.fontFamily =
          parsedStore.font || ''
        //将本地存储的设置合并回 state
        Object.assign(state.value, parsedStore)
      } catch (e) {
        console.error('解析 USER_SETTINGS 时出错:', e)
      }
    }
  }
  // 【重要】在 setup 函数执行时立即调用 getState。
  // 这意味着只要程序一引用这个 store，就会自动触发读取本地缓存，无需外部手动调用 init
  getState()
  return {
    state,
    setState,
    $reset
  }
})
