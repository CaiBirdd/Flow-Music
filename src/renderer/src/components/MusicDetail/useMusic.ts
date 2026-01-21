import ColorThief from 'colorthief'

// 用于控制背景切换的双缓冲指针（0 或 1）
let activeLayerIndex = 1

/**
 * 颜色提取函数 用来根据专辑封面动态生成背景渐变色，让界面风格与歌曲封面保持一致
 * @param img HTMLImageElement - 图片 DOM 元素
 * @returns Array<Array<string>> - 返回一个包含 RGB 颜色的数组的数组，例如 [[255, 0, 0], [0, 255, 0], ...]
 */
export function colorExtraction(img: HTMLImageElement) {
  const colorThief = new ColorThief()
  // getPalette 方法会返回图片中主要的调色板颜色列表 里面是有权重的，第一个是主色调，后面次之
  return colorThief.getPalette(img) as Array<Array<string>>
}

// 渐变背景切换函数 歌曲详情页切歌时，背景会平滑切换
// 核心原理：双缓冲 (Double Buffering)
// 页面上有两个重叠的 div (#gradual0 和 #gradual1)。
// 每次切换时，改变"看不见"的那个 div 的背景，然后通过透明度(opacity)交替显示它们。
export function gradualChange(img: HTMLImageElement, rgb: Array<Array<string>>) {
  // 获取两个用于显示背景的 DOM 元素
  const gradual0 = document.querySelector('#gradual0') as HTMLDivElement
  const gradual1 = document.querySelector('#gradual1') as HTMLDivElement
  if (!gradual0 || !gradual1) {
    return
  }
  //传入了图片，需要设置渐变背景
  if (img) {
    if (activeLayerIndex === 0) {
      // 指针为 0，操作 gradual0 显示，gradual1 隐藏
      // 设置 CSS 线性渐变：从 rgb[0] 渐变到 rgb[1] 从最主要的颜色到第二主要的颜色
      gradual0.style.backgroundImage = `linear-gradient(rgb(${rgb[0]}), rgb(${rgb[1]}))`
      gradual0.style.opacity = '1'

      gradual1.style.opacity = '0'
      activeLayerIndex = 1 // 切换指针，下次轮到 gradual1 显示
    } else {
      // 指针为 1，操作 gradual1 显示，gradual0 隐藏
      // 设置 CSS 线性渐变：从 rgb[0] 渐变到 rgb[1]
      gradual1.style.backgroundImage = `linear-gradient(rgb(${rgb[0]}), rgb(${rgb[1]}))`
      gradual1.style.opacity = '1'

      gradual0.style.opacity = '0'
      activeLayerIndex = 0 // 切换指针，下次轮到 gradual0 显示
    }
  } else {
    //没有图片，逻辑同上，只是把背景置空
    if (activeLayerIndex === 0) {
      gradual0.style.backgroundImage = ``
      gradual0.style.opacity = '1'

      gradual1.style.opacity = '0'
      activeLayerIndex = 1
    } else {
      gradual1.style.backgroundImage = ``
      gradual1.style.opacity = '1'

      gradual0.style.opacity = '0'
      activeLayerIndex = 0
    }
  }
}

/**
 * 节律背景效果Hook
 * @param insertionEl - 这些切割后的图片要插入到的父容器 DOM
 * 性能优化点:
 * 1. 复用canvas对象，避免重复创建
 * 2. 使用requestAnimationFrame优化渲染时机
 * 3. 复用DOM元素，减少重排重绘
 * 4. 将原操作style样式表对象的操作删除，简化代码，内存泄露还解决了 也不卡了 之前一直以为是详情页的原因
 */
export const useRhythm = (insertionEl: HTMLElement | null) => {
  // 优化 Canvas 对象池
  // 避免每次切歌都 new 4个 Canvas，而是复用这4个，减少内存分配和垃圾回收压力
  const canvasPool: HTMLCanvasElement[] = []
  for (let i = 0; i < 4; i++) {
    canvasPool.push(document.createElement('canvas'))
  }

  /**
   * 分割图片并创建旋转动画效果
   * 将专辑封面分割为4块，分别在四角进行旋转动画
   */
  const splitImg = (img: HTMLImageElement) => {
    if (!insertionEl) return

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
          // quality: 0.8 -> 用 80% 的质量，反正后面要高斯模糊，糊一点看不出来，但体积小很多。
          const imgUrl = cutCanvas.toDataURL('image/jpeg', 0.8)

          // 动态生成动画起始角度 (0-360)
          const deg = Math.floor(Math.random() * 360)

          // DOM 元素的复用逻辑
          if (!nodesLength) {
            // 如果是第一次运行，创建新的 DOM 元素
            const imageElement = document.createElement('div')
            imageElement.className = `cut-image cut-image-${index}`
            // 设置 CSS 变量 --start-deg，驱动 CSS 动画从随机角度开始
            imageElement.style.setProperty('--start-deg', `${deg}deg`)
            // left/top 决定了这块碎片在屏幕的哪个位置 (左上/右上/左下/右下)
            imageElement.style.cssText += `
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
            // 更新 CSS 变量，从新的随机角度开始
            node.style.setProperty('--start-deg', `${deg}deg`)
          }

          // 处理下一块碎片
          index++
        }
      }
    })
  }

  return {
    splitImg
  }
}
