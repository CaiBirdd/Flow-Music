// ==================== 时间和日期处理 ====================
/**
 * 将毫秒数格式化为 "分:秒" 的格式
 * 例如: 275573ms -> "04:35"
 * @param msec 传入的时间数值
 * @param isMsec 是否是毫秒 (默认为 true)，如果是 false 则当做秒处理
 * 假如传入135000  135000 / 1000 = 135秒 135 % 60 = 15 (135 - 15) / 60 = 2 02:15
 */
export function formattingTime(msec: number, isMsec = true) {
  let result = ''
  // 统一转换为秒单位
  const s = isMsec ? msec / 1000 : msec
  //计算剩余秒数部分
  const sec = Math.floor(s % 60)
  //计算分钟数部分
  const minute = Math.floor((s - sec) / 60)
  // 拼接字符串，如果小于 1，在前面补 '0'
  result = `${
    minute.toString().length <= 1 ? '0' + minute : minute
  }:${sec.toString().length <= 1 ? '0' + sec : sec}`

  return result
}
/**
 * 格式化时间戳
 * 将 Date 对象转换为指定格式的字符串，如 "2016-06-19 10:05:44"
 * @param timestamp 时间戳
 * @param format 格式模板，默认为 'YY-MM-DD hh:mm:ss'
 */
export function formatDate(timestamp: number, format: string = 'YY-MM-DD hh:mm:ss') {
  const date = new Date(timestamp)
  const year = date.getFullYear(),
    month = date.getMonth() + 1, // 注意：JS中月份是 0-11，所以要 +1
    day = date.getDate(),
    hour = date.getHours(),
    min = date.getMinutes(),
    sec = date.getSeconds()
  // 预生成一个 00-09 的补零数组，用于快速补齐两位数变成 ['00', '01', ... '09']
  const preArr = [...Array(10)].map((_, index) => {
    return '0' + index
  })
  // 使用正则替换传入的模板，将格式模板中的占位符替换为实际值
  const result = format
    .replace(/YY/g, '' + year)
    .replace(/MM/g, preArr[month] || '' + month)
    .replace(/DD/g, preArr[day] || '' + day)
    .replace(/hh/g, preArr[hour] || '' + hour)
    .replace(/mm/g, preArr[min] || '' + min)
    .replace(/ss/g, preArr[sec] || '' + sec)
  return result
}

// 获取当前月份的第几天
export function varDayim() {
  return new Date().getDate()
}
// 判断给定的时间戳是否是“今天”
export function calculateIsToday(timestamp: number): boolean {
  // 技巧：将时间的时候、分、秒、毫秒都设为 0，只比较日期部分
  const todayDate = new Date().setHours(0, 0, 0, 0)
  const paramsDate = new Date(timestamp).setHours(0, 0, 0, 0)

  return todayDate === paramsDate
}

// ==================== 随机数 ====================
/**
 * 生成指定范围内的随机数
 * Math.random()是 Js 原生的随机函数，它会返回一个 [0, 1) 之间的随机小数
 * @param decimals 是否返回小数 (true则返回小数，false返回整数)
 * 最后加minNum是为了让从传入的指定起始值开始，要不一直都是0开始了
 */
export function randomNum(minNum: number, maxNum: number, decimals = false) {
  if (decimals) {
    return Math.random() * (maxNum - minNum) + minNum
  }
  return Math.floor(Math.random() * (maxNum - minNum + 1) + minNum)
}

// ==================== 对象属性安全访问 ====================
/**
 * 嵌套取值 因为SongList 组件的列是动态，通过columns来配置，可选链是静态的不行
 * 作用：避免访问深层对象时因为中间属性不存在而报错
 * 例子：lookup(user, 'profile.address.city')
 */
export function lookup(obj: object, key: string | undefined): any {
  if (!key) {
    return ''
  }
  if (!key.includes('.')) {
    return obj[key as keyof typeof obj]
  }
  let temp: any = obj
  for (const item of key.split('.')) {
    if (!temp) {
      return ''
    }
    temp = temp[item as keyof typeof temp]
  }
  return temp ?? ''
}
// 类型守卫：判断是否为字符串
export const isString = (value: any): value is string => {
  return typeof value === 'string'
}

// ==================== 图片预加载与平滑过渡 ====================
/**
 * 切换图片过渡 (防止图片闪烁，并进行内存优化)
 * 返回一个 Promise，只有当图片加载成功后才 resolve
 * 作用是：
 * 1. 预加载图片，保证后续提取颜色有图片数据
 * 2. 避免图片闪烁，图片加载中就去操作会导致闪烁或报错
 * 3. 优化内存使用
 * 预加载并处理一张网络图片，让它准备好被后续逻辑（比如 Canvas 绘图或颜色提取）安全地使用”
 */
export function toggleImg(src: string, size?: string): Promise<HTMLImageElement> {
  if (!src) {
    return Promise.reject(`toggleImg：传递的src为空: ${src}`)
  }
  const img = new Image()
  // 在src后面添加尺寸参数，如 ?param=200y200
  img.src = size ? src + `?param=${size}` : src
  // 设置跨域，允许 Canvas 读取图片数据 (用于后续提取颜色)
  img.crossOrigin = 'Anonymous'
  // 预设宽高为屏幕宽高
  img.width = document.body.clientWidth
  img.height = document.body.clientHeight

  return new Promise((resolve, reject) => {
    img.onload = () => {
      // 图片下载完resolve
      img.onload = null
      img.onerror = null
      resolve(img)
    }
    img.onerror = () => {
      // 即使失败也要清理引用
      img.onload = null
      img.onerror = null
      console.error(`Failed to load image: ${src}`)
      // 加载失败时reject，避免Promise悬挂
      reject(new Error(`Failed to load image: ${src}`))
    }
  })
}

// ==================== URL 路径解析 ====================
/**
 * 解析路径中的查询参数
 * 将 "/path?a=1&b=2" 转换为 { path: "/path", query: { a: '1', b: '2' } }
 */
export function parsePathQuery(path: string) {
  const result = {
    path: path,
    query: {} as { [key: string]: any }
  }
  //找到问号位置
  const index = path.indexOf('?')
  if (index === -1) {
    return result
  }
  //截取问号前的路径
  result.path = path.slice(0, index)
  //截取问号后的字符串并按 & 拆分
  const queryArr = path.slice(index + 1).split('&')
  queryArr.forEach((item) => {
    //按 = 拆分键和值
    const index = item.indexOf('=')
    const key = item.slice(0, index)
    const value = item.slice(index + 1)
    result.query[key] = value
  })
  return result
}

//==================== 颜色算法相关 ====================
//RGB 转 HSL
// HSL (色相, 饱和度, 亮度) 比 RGB 更容易进行色彩分析
export function rgbToHsl(r: number, g: number, b: number) {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  let h = 0
  let s = 0
  //算亮度
  const l = (max + min) / 2
  //以下是计算色相、饱和度、亮度的标准转换公式
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)
        break
      case gNorm:
        h = (bNorm - rNorm) / d + 2
        break
      case bNorm:
        h = (rNorm - gNorm) / d + 4
        break
    }
    h /= 6
  }

  return [h, s, l]
}

//判断颜色是否“好看”
// 用于过滤掉太黑、太白、太灰的颜色，这些颜色做背景不好看
export function isGoodColor(r: number, g: number, b: number) {
  const hsl = rgbToHsl(r, g, b)
  const s = hsl[1] // 饱和度
  const l = hsl[2] // 亮度
  // 过滤掉过亮或过暗，过饱和或过淡的颜色
  if (l < 0.2 || l > 0.8 || s < 0.2 || s > 0.8) {
    return false
  }
  return true
}
//寻找最佳颜色组合
/**
 * 从一组颜色中选出 num 个“最好”的颜色
 * 算法思路：优先选 isGoodColor 的，然后选差异化最大的
 * 用于从封面颜色中选取“适合作为渐变背景”的颜色
 * 目标：色相保持相对一致，通过亮度和饱和度拉开层次，避免脏色
 * 策略：牺牲色彩丰富度（不选红配绿），换取视觉协调性（同色系的深浅渐变）
 */
export function findBestColors(
  colors: Array<[number, number, number]>,
  num: number
): Array<[number, number, number]> {
  // 1. 过滤：先只选“好颜色”
  let goodColors = colors.filter((color) => isGoodColor(...color))

  // 2. 兜底：如果好颜色不够，用坏颜色补齐
  if (goodColors.length < num) {
    const badColors = colors.filter((color) => !isGoodColor(...color))
    goodColors = [...goodColors, ...badColors.slice(0, num - goodColors.length)]
  }

  // 3. 预处理 (性能优化)：
  // 预先计算所有候选颜色的 HSL，避免在循环中重复计算 (O(N) -> O(1))
  const candidates = goodColors.map((rgb) => ({
    rgb,
    hsl: rgbToHsl(...rgb)
  }))
  console.log(candidates, '挑出来的好颜色，转成hsl了')

  // 4. 初始化：
  // 直接选取第一个候选项（ColorThief 返回的第一个通常是主色调/权重最高的）
  // 这样省去了第一轮无效的比较循环
  const first = candidates.shift()
  if (!first) return []

  const bestColors = [first]

  // 5. 贪心选择 (Maximin 策略)：
  // 已经有了 1 个，还需要选 num - 1 个
  for (let i = 1; i < num; i++) {
    let bestCandidate: typeof first | undefined
    let maxMinDist = 0

    // 遍历剩余的候选者
    for (const candidate of candidates) {
      // 计算当前候选者与“已选组合”的最小距离 (这里用 reduce 寻找最近邻居)
      const minDist = bestColors.reduce((min, selected) => {
        // 只计算 Saturation 和 Lightness 的差异 (忽略 Hue)
        const dist =
          Math.abs(selected.hsl[1] - candidate.hsl[1]) +
          Math.abs(selected.hsl[2] - candidate.hsl[2])
        return Math.min(min, dist)
      }, Infinity)

      // 如果这个候选者离大家最远（最独特），暂定为最佳人选
      if (minDist > maxMinDist) {
        maxMinDist = minDist
        bestCandidate = candidate
      }
    }

    // 将这一轮的最佳人选加入已选列表，并从候选池移除
    if (bestCandidate) {
      bestColors.push(bestCandidate)
      const index = candidates.indexOf(bestCandidate)
      if (index > -1) {
        candidates.splice(index, 1)
      }
    }
  }

  // 最后只需返回原始的 rgb 数据
  return bestColors.map((c) => c.rgb)
}

// ==================== Electron 环境判断 ====================
export const isElectron = () => {
  // darwin: macOS 操作系统
  // linux: Linux 操作系统
  // win32: Windows 操作系统（即使在 64 位系统上也是返回这个值）
  return ['linux', 'win32'].includes(window.electron?.process.platform || '')
}

// ==================== 数字转中文单位 (播放量) ====================

/**
 * 将大数字转换为 "万" 或 "亿" 结尾的字符串
 * 音乐App常见功能：显示 "10.5万" 而不是 "105000"
 */
export function formatNumberToMillion(number: number) {
  if (number >= 100000000) {
    // 如果数字大于等于 1 亿
    const billionNumber = Math.floor(number / 10000000) / 10 // 强制截取一位小数
    return `${billionNumber}亿`
  } else if (number >= 10000) {
    // 如果数字大于等于 1 万
    const millionNumber = Math.floor(number / 1000) / 10 // 强制截取一位小数
    return `${millionNumber}万`
  } else {
    return number.toString() // 数字小于 1 万，不需要处理
  }
}
// ==================== URL 校验 ====================
//设置页面的url
type UrlValidationResult = {
  isValid: boolean
  message: string
}
export function checkUrlValidity(url: string): UrlValidationResult {
  try {
    const parsed = new URL(url) // // 利用原生 API 检查 如果格式错误会抛异常
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, message: '协议必须是 http 或 https' }
    }
    return { isValid: true, message: '' }
  } catch {
    return { isValid: false, message: 'URL 格式不正确' }
  }
}
