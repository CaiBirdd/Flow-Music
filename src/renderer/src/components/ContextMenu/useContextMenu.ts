import { ref } from 'vue'

// 定义一个唯一的 Symbol 作为依赖注入（Provide/Inject）的 Key
const MENU_KEY = Symbol('context-menu-key')

export const useContextMenu = (): any => {
  // 初始值为 null，表示当前没有任何菜单被打开
  // 当有菜单打开时，这里会存储该菜单的控制对象（包含 id 和 hideMenu 方法）
  const activeMenu = ref(null)

  const setActiveMenu = (menu: any): void => {
    if (activeMenu.value && activeMenu.value !== menu) {
      // 前缀分号用于避免 ASI（自动分号插入）的潜在问题
      // 当一行代码以括号 ( 开头时，解析器可能误认为它是上一行的延续
      // 分号可以明确地告诉解析器这是一个新的语句，防止意外行为
      // 这一步就是“清场”，强制关闭上一个菜单
      ;(activeMenu.value as any).hideMenu()
    }
    //更新状态 将当前激活的菜单设置为新传入的 menu（或者是 null）
    activeMenu.value = menu
  }

  return {
    MENU_KEY, // MENU_KEY: 给子孙组件 inject 用
    activeMenu, // 当前谁开着（其实子组件很少读这个，主要给 setActiveMenu 内部判断用）
    setActiveMenu // 给子孙组件用来注册自己或关闭别人的方法
  }
}
