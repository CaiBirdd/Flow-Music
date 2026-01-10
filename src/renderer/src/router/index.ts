import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { useFlags } from '@/store/flags'
import pinia from '@/store/store' //这里主要用到 flags.maxCount (记录最大层级深度)
import { parsePathQuery } from '@/utils' // parsePathQuery: 用于把一个 url 字符串 (如 "/home?id=1") 解析成对象 { path: '/home', query: { id: 1 } }

/**
 * 创建路由实例
 * 使用 Hash 模式，并配置路由表和滚动行为
 */
const router = createRouter({
  history: createWebHashHistory(), // 使用 Hash 模式 (URL 带 #)
  routes: routes,
  scrollBehavior: () => ({ top: 0 }) // 每次跳转页面都会强制滚动到顶部
})

// 保存原始的 push 方法 因为下面要重写
const originPush = router.push
const flags = useFlags(pinia)

/**
 * 重写 router.push 方法
 * 每次跳转时自动在 query 中添加或累加 count 参数，用于记录页面跳转深度
 */
router.push = (params) => {
  let to // 定义最终要跳转的目标对象
  // 获取当前路由的 count（层级），如果不存在则默认为 0
  // +...!: 前面的 '+' 将字符串转为数字，后面的 '!' 是 TS 非空断言
  let count = +router.currentRoute.value.query.count!
  // 判读 params 是字符串还是对象
  if (typeof params === 'string') {
    // 处理字符串形式的跳转路径
    const result = parsePathQuery(params)
    // 构建新的跳转对象
    to = {
      path: result.path,
      query: {
        count: ++count, // 核心逻辑：层级 +1 (比如从第 1 层跳到第 2 层)
        ...result.query // 保留原本的查询参数
      }
    }
  } else {
    // 处理对象形式的跳转参数
    to = {
      ...params,
      query: {
        ...params.query,
        count: ++count
      }
    }
  }
  // 调用原始 push 方法执行跳转
  return originPush(to)
}

/**
 * 全局前置守卫
 * 1. 确保每个路由都有 count 参数（默认为 1）
 * 2. 记录并更新最大跳转深度 maxCount
 */
router.beforeEach((to, from, next) => {
  const count = to.query.count
  if (!count) {
    // 情况:如果没有 count，重定向到带 count=1 的路由  (作为栈底/第一层) (通常是首次访问、刷新页面或手动输入 URL)
    // next(...) 表示中断当前导航，进行一个新的导航
    next({
      ...to,
      query: {
        ...to.query,
        count: 1 // 强制设为第 1 层 (栈底)
      }
    })
  } else {
    // 情况2正常跳转：更新全局状态中的最大计数值
    if (+count > flags.maxCount) {
      flags.maxCount = +count
    }
    next()
  }
})

export default router
