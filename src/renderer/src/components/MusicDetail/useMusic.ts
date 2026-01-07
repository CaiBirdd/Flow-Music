import ColorThief from 'colorthief'

// 用于控制背景切换的双缓冲指针（0 或 1）
let pointer = 1

/**
 * 颜色提取函数 用来根据专辑封面动态生成背景渐变色，让界面风格与歌曲封面保持一致
 * @param img HTMLImageElement - 图片 DOM 元素
 * @returns Array<Array<string>> - 返回一个包含 RGB 颜色的数组的数组，例如 [[255, 0, 0], [0, 255, 0], ...]
 */
export function colorExtraction(img: HTMLImageElement) {
  const colorThief = new ColorThief()
  // getPalette 方法会返回图片中主要的调色板颜色列表
  return colorThief.getPalette(img) as Array<Array<string>>
}

/**
 * 渐变背景切换函数 歌曲详情页切歌时，背景会平滑切换
 * 核心原理：双缓冲 (Double Buffering)
 * 页面上有两个重叠的 div (#gradual1 和 #gradual2)。
 * 每次切换时，改变"看不见"的那个 div 的背景，然后通过透明度(opacity)交替显示它们。
 */
export function gradualChange(img: HTMLImageElement, rgb: Array<Array<string>>) {
  // 获取两个用于显示背景的 DOM 元素
  const gradual1 = document.querySelector('#gradual1') as HTMLDivElement
  const gradual2 = document.querySelector('#gradual2') as HTMLDivElement
  if (!gradual1 || !gradual2) {
    return
  }
  //传入了图片，需要设置渐变背景
  if (img) {
    if (pointer === 0) {
      // 指针为 0，操作 gradual1 显示，gradual2 隐藏
      // 设置 CSS 线性渐变：从 rgb[0] 渐变到 rgb[1]
      gradual1.style.backgroundImage = `linear-gradient(rgb(${rgb[0]}), rgb(${rgb[1]}))`
      gradual1.style.opacity = '1'

      gradual2.style.opacity = '0'
      pointer = 1 // 切换指针，下次轮到 gradual2 显示
    } else {
      // 指针为 1，操作 gradual2 显示，gradual1 隐藏
      // 设置 CSS 线性渐变：从 rgb[0] 渐变到 rgb[1]
      gradual2.style.backgroundImage = `linear-gradient(rgb(${rgb[0]}), rgb(${rgb[1]}))`
      gradual2.style.opacity = '1'

      gradual1.style.opacity = '0'
      pointer = 0 // 切换指针，下次轮到 gradual1 显示
    }
  } else {
    //没有图片，逻辑同上，只是把背景置空
    if (pointer === 0) {
      gradual1.style.backgroundImage = ``
      gradual1.style.opacity = '1'

      gradual2.style.opacity = '0'
      pointer = 1
    } else {
      gradual2.style.backgroundImage = ``
      gradual2.style.opacity = '1'

      gradual1.style.opacity = '0'
      pointer = 0
    }
  }
}

/**
 * 节律背景效果Hook
 * @param insertionEl - 这些切割后的图片要插入到的父容器 DOM
 * 性能优化点:
 * 1. 复用canvas对象，避免重复创建
 * 2. 清理旧CSS规则，防止内存泄漏
 * 3. 使用requestAnimationFrame优化渲染时机
 * 4. 复用DOM元素，减少重排重绘
 */
export const useRhythm = (insertionEl: HTMLElement | null) => {
  // 动态创建一个 <style> 标签，用来稍后插入 @keyframes 动画规则
  const style = document.createElement('style')
  style.id = 'rhythm-animation-styles'
  document.head.appendChild(style)
  const stylesheet = style.sheet // 获取样式表对象 就能用 .insertRule() 和 .deleteRule() 动态增删代码了

  // 优化 Canvas 对象池
  // 避免每次切歌都 new 4个 Canvas，而是复用这4个，减少内存分配和垃圾回收压力
  const canvasPool: HTMLCanvasElement[] = []
  for (let i = 0; i < 4; i++) {
    canvasPool.push(document.createElement('canvas'))
  }

  // 一个计数器，用来记录我们往 style 标签里插了多少行规则，方便后面删除。
  let insertedRulesCount = 0

  /**
   * 清理旧 CSS 规则的辅助函数
   * 防止随着切歌次数增加，<style> 里的规则无限膨胀，导致样式计算变慢
   */
  const clearOldRules = () => {
    if (!stylesheet) return
    // 从后往前删除，避免索引偏移问题 如果从前往后删，数组索引会变，导致漏删或者报错。
    while (insertedRulesCount > 0 && stylesheet.cssRules.length > 0) {
      stylesheet.deleteRule(stylesheet.cssRules.length - 1)
      insertedRulesCount--
    }
    insertedRulesCount = 0
  }

  /**
   * 分割图片并创建旋转动画效果
   * 将专辑封面分割为4块，分别在四角进行旋转动画
   */
  const splitImg = (img: HTMLImageElement) => {
    if (!insertionEl) return

    // 先清理上一首歌生成的动画规则
    clearOldRules()

    const imgWidth = img.naturalWidth
    const imgHeight = img.naturalHeight
    // 计算每一块小图的宽高
    const smallImageWidth = imgWidth / 2
    const smallImageHeight = imgHeight / 2
    let index = 0 // 用来标记是第几块 (0-3)
    const nodesLength = insertionEl.childNodes.length // 用来标记当前插入了多少个 DOM 元素

    // 优化 使用requestAnimationFrame确保在下一帧渲染，减少卡顿
    // 确保这些繁重的绘图操作在浏览器下一次重绘之前执行，避免阻塞主线程导致卡顿
    requestAnimationFrame(() => {
      // 双重循环：y=0,1 和 x=0,1，正好遍历 2x2 的网格
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 2; x++) {
          // 复用canvas对象 从对象池取出一个 Canvas
          const cutCanvas = canvasPool[index]
          // 调整画板大小适应当前图片
          cutCanvas.width = smallImageWidth
          cutCanvas.height = smallImageHeight

          const cutCtx = cutCanvas.getContext('2d', {
            // 优化 alpha: false -> 告诉浏览器这一层没有透明的，渲染更快
            // desynchronized: true -> 允许异步绘制，进一步压榨性能
            alpha: false,
            desynchronized: true
          })
          if (!cutCtx) return

          // Canvas 绘图核心：drawImage(源图, 源X, 源Y, 源宽, 源高, 目标X, 目标Y, 目标宽, 目标高)
          // 这里的逻辑就是从原图的对应位置抠出一块，画满整个小 Canvas
          // 比如 x=0, y=0 时，就是抠左上角那块
          cutCtx.drawImage(
            img,
            x * smallImageWidth,
            y * smallImageHeight, // 抠图起始点
            smallImageWidth,
            smallImageHeight, // 抠多大
            0,
            0, // 贴到画板哪里（左上角）
            smallImageWidth,
            smallImageHeight // 贴多大（铺满）
          )

          // 把画板上的内容变成一串 base64 字符。
          // quality: 0.6 -> 用 60% 的质量，反正后面要高斯模糊，糊一点看不出来，但体积小很多。
          const imgUrl = cutCanvas.toDataURL('image/jpeg', 0.6)

          // DOM 元素的复用逻辑
          if (!nodesLength) {
            // 如果是第一次运行，创建新的 DOM 元素
            const imageElement = document.createElement('div')
            imageElement.className = `cut-image cut-image-${index}`
            // left/top 决定了这块碎片在屏幕的哪个位置 (左上/右上/左下/右下)
            imageElement.style.cssText = `
              background-image: url(${imgUrl});
              width: 50vw;
              height: 50vh;
              position: absolute;
              left: ${x * 50}vw;
              top: ${y * 50}vh;
              background-size: cover;
              will-change: transform;
              contain: layout style paint;
            `
            insertionEl.appendChild(imageElement)
          } else {
            // 优化 如果 DOM 已经存在（比如切歌时），直接复用，只换背景图
            const node = insertionEl.childNodes[index] as HTMLElement
            node.style.backgroundImage = `url(${imgUrl})`
          }

          // 动态生成动画
          // 生成一个随机角度 (0-360)，让每块碎片的旋转起点不同，看起来更有动感
          const deg = Math.floor(Math.random() * 360)
          const animationName = `cut-rotate-${index}-${Date.now()}`

          // 插入新的CSS动画规则
          if (stylesheet) {
            // 插入 @keyframes 规则：
            // 它是从 "随机角度" 转到 "随机角度 + 360度" (转一圈)
            stylesheet.insertRule(
              `@keyframes ${animationName} {
                from { transform: rotate(${deg}deg) translate3d(0,0,0); }
                to { transform: rotate(${deg + 360}deg) translate3d(0,0,0); }
              }`,
              stylesheet.cssRules.length
            )
            insertedRulesCount++ // 这里的 ++ 是为了记录插入的位置

            // 给当前的 div 应用这个动画，时长 80秒，无限循环
            stylesheet.insertRule(
              `div.cut-image-${index} {
                animation: ${animationName} 80s infinite linear;
                backface-visibility: hidden;
                perspective: 1000px;
              }`,
              stylesheet.cssRules.length
            )
            insertedRulesCount++ // 这里的 ++ 是为了记录插入的位置
          }
          // 处理下一块碎片
          index++
        }
      }
    })
  }

  /**
   * 清理函数，组件卸载时调用
   */
  const cleanup = () => {
    clearOldRules()
    const styleEl = document.getElementById('rhythm-animation-styles')
    if (styleEl) {
      styleEl.remove()
    }
  }

  return {
    splitImg,
    cleanup
  }
}
