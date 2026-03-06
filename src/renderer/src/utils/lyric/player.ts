/**
 * 歌词播放器
 * 核心功能：时间同步、平滑滚动、二分查找、用户交互
 */

import gsap from 'gsap'
import type { LyricLine } from './parser'

export interface LyricPlayerOptions {
  container: HTMLElement // 歌词滚动的容器（那个有 overflow: scroll 的 div）
  audio: HTMLAudioElement // 这里的 Audio 对象，用于获取 currentTime
  onLineClick?: (time: number, index: number) => void // 点击某行歌词时的回调（通常用于调节进度）
  onLineChange?: (index: number) => void // 歌词行改变时的回调（比如用于高亮样式）
}

export class LyricPlayer {
  // --- 核心依赖 ---
  private container: HTMLElement
  private audio: HTMLAudioElement
  // --- 数据状态 ---
  private lyrics: LyricLine[] = [] // 存储解析后的歌词数组
  private currentIndex: number = -1 // 当前高亮的是哪一行
  private noTimestamp: boolean = false // 标记是否是纯文本（无时间轴）歌词
  // --- 播放控制与动画 ---
  private rafId: number | null = null // requestAnimationFrame 的 ID，用于循环检测时间
  private isPlaying: boolean = false // 播放器内部的播放状态标记
  // --- 交互控制 (重点) ---
  private isUserScrolling: boolean = false // 标记用户是否正在滚动。如果是，则暂停自动滚动
  private scrollTimer: ReturnType<typeof setTimeout> | null = null // 滚动结束的防抖定时器
  // --- DOM 缓存 ---
  private lineElements: HTMLElement[] = [] // 缓存每一行歌词的 DOM 节点，避免频繁 querySelector
  // --- 回调函数 ---
  private onLineClick?: (time: number, index: number) => void
  private onLineChange?: (index: number) => void

  constructor(options: LyricPlayerOptions) {
    this.container = options.container
    this.audio = options.audio
    this.onLineClick = options.onLineClick
    this.onLineChange = options.onLineChange
    this.initEvents()
  }

  private initEvents(): void {
    // 用户滚动检测 侦听滚轮事件 'wheel' passive:true是性能优化参数
    this.container.addEventListener('wheel', this.handleWheel, { passive: true })

    // 点击歌词跳转（事件委托）不给每一行歌词都绑定click，只给最外层的container绑
    // 这样不管点到哪里，时间都会冒泡到container，在这统一处理
    this.container.addEventListener('click', this.handleClick)
  }
  //注意这里的箭头函数 this指向的LyricPlayer 实例 箭头函数指向定义时的外层
  //原因是handleWheel是作为回调传给addEventListener，如果携程普通函数，this指向可能会丢失或者指向DOM元素
  //普通函数是谁调用我，我就指向谁
  //防抖逻辑
  private handleWheel = (): void => {
    this.isUserScrolling = true
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer)
    }
    this.scrollTimer = setTimeout(() => {
      this.isUserScrolling = false
    }, 3000)
  }
  //点击歌词跳转
  private handleClick = (e: MouseEvent): void => {
    //获取点击的位置，可能是lyric-text div也可能是lyric-translation div
    const target = e.target as HTMLElement
    //从点击的元素开始往上找，冒泡向上寻找最近的歌词行元素 lyric-line
    const lineEl = target.closest('.lyric-line') as HTMLElement
    //如果没点到歌词行，或者这是纯文本歌词，就直接返回
    if (!lineEl || this.noTimestamp) return

    // 从 DOM 属性中读出这一行对应的索引 dataset 里的都是字符串，要转成数字
    const index = parseInt(lineEl.dataset.index || '0', 10)
    // 从歌词数组中拿到这一行对应的时间
    if (index >= 0 && index < this.lyrics.length) {
      const time = this.lyrics[index].time
      //在MusicPlayer组件中，外面写了一个回调函数传了进来，作用是将点击行的时间赋值给currentTime
      this.onLineClick?.(time, index)
    }
  }

  /**
   * 设置歌词数据并渲染 类中的函数不用写function
   */
  setLyrics(lyrics: LyricLine[], noTimestamp: boolean = false): void {
    this.lyrics = lyrics
    this.noTimestamp = noTimestamp
    this.currentIndex = -1
    this.render()
    // 如果有歌词，默认先高亮第 0 行，让它显示出来
    if (!noTimestamp && lyrics.length > 0) {
      this.updateLine(0, true)
    }
  }

  /**
   * 渲染歌词 DOM
   */
  private render(): void {
    if (!this.container) return

    if (this.lyrics.length === 0) {
      this.container.innerHTML = `<div class="lyric-empty">暂无歌词</div>`
      this.lineElements = [] //清空缓存
      return
    }
    // 创建文档片段 (DocumentFragment) —— 性能优化关键！
    // 这是一个内存中的"虚拟DOM容器"，如果有100行歌词，一行行append，浏览器会重绘100次，很卡
    // 用fragment，先把这100行贴到它身上，最后一次性把fragment贴到container，只重绘1次
    const fragment = document.createDocumentFragment()
    this.lineElements = [] // 重置缓存数组

    // 顶部占位，让第一行能滚动到中间
    const topSpacer = document.createElement('div')
    topSpacer.className = 'lyric-spacer'
    topSpacer.style.height = '45%'
    fragment.appendChild(topSpacer)
    // 循环生成每一行歌词
    for (const line of this.lyrics) {
      const div = document.createElement('div')
      div.className = 'lyric-line'
      div.dataset.index = String(line.index) // 埋点：把索引存进 DOM，给 handleClick 用

      // 原歌词文本
      const textEl = document.createElement('div')
      textEl.className = 'lyric-text'
      textEl.textContent = line.text || '...'
      div.appendChild(textEl)

      // 翻译文本（如果有）
      if (line.translation) {
        const transEl = document.createElement('div')
        transEl.className = 'lyric-translation'
        transEl.textContent = line.translation
        div.appendChild(transEl)
      }

      if (this.noTimestamp) {
        div.classList.add('no-timestamp')
      }
      // 把刚create出来的div存入缓存数组，方便后续快速访问
      // 比如要高亮第 5 行时，直接 this.lineElements[5] 就拿到了，不需要再去 document.querySelector，速度极快
      this.lineElements.push(div)
      // 把这个div挂到fragment上
      fragment.appendChild(div)
    }

    // 底部占位，让最后一行能滚动到中间
    const bottomSpacer = document.createElement('div')
    bottomSpacer.className = 'lyric-spacer'
    bottomSpacer.style.height = '45%'
    fragment.appendChild(bottomSpacer)

    //一次性加到DOM树 前面都是fragment上操作。浏览器只重绘一次
    this.container.innerHTML = ''
    this.container.appendChild(fragment)
  }

  /**
   * 二分查找当前应该高亮的行
   *  @param time 当前播放时间（秒）
   *  @returns 对应歌词行的索引 (index)
   */
  private findCurrentLine(time: number): number {
    if (this.lyrics.length === 0) return -1

    let left = 0
    let right = this.lyrics.length - 1

    // 如果时间比第一句还早（前奏），就停在第一句
    if (time < this.lyrics[0].time) return 0

    // 如果时间比最后一句还晚（尾奏），就停在最后一句
    if (time >= this.lyrics[right].time) return right

    // 二分查找
    while (left <= right) {
      //Math.floor是向下取整
      const mid = Math.floor((left + right) / 2)
      const midTime = this.lyrics[mid].time //取出这行的时间
      // 获取下一行的时间（如果是最后一行，下一行时间就是无穷大）
      const nextTime = mid < this.lyrics.length - 1 ? this.lyrics[mid + 1].time : Infinity

      // 命中条件：时间落在这个区间 [当前行时间, 下一行时间) 传入time和[midTime,nextIme)比
      // 普通二分查找是精确匹配，歌词这里是区间匹配
      // 例如：当前行是 10秒，下一行是 15秒。如果 time 是 12秒，那就是这一行！
      if (time >= midTime && time < nextTime) {
        return mid
      }
      // 如果当前时间比查到的时间小，说明在左半区
      if (time < midTime) {
        right = mid - 1
      } else {
        // 否则在右半区
        left = mid + 1
      }
    }
    //程序的真实逻辑主要依靠 return mid 结束，这里基本没用
    //处理跑完了没找到的情况，返回左指针
    return left
  }

  /**
   * 更新当前行高亮和调用滚动函数
   * @param index 目标行号
   * @param force 是否强制更新（比如用于用户拖动进度条后，强行纠正位置）
   */
  private updateLine(index: number, force: boolean = false): void {
    //性能优化：如果目标行号和当前行号一样，就不操作 DOM
    if (index === this.currentIndex && !force) return
    // 防止索引越界
    if (index < 0 || index >= this.lineElements.length) return

    // 移除旧的高亮 如果是最开始currentIndex=-1跳过这了
    // this.currentIndex 此时还存着“上一行”的索引
    if (this.currentIndex >= 0 && this.currentIndex < this.lineElements.length) {
      this.lineElements[this.currentIndex].classList.remove('active')
    }

    // 添加新的高亮
    this.currentIndex = index
    this.lineElements[index].classList.add('active')

    // 滚动到当前行
    this.scrollToLine(index, force)

    // 对外广播：告诉外部组件“现在唱到第几行了”
    // 外部组件可能需要这个信息来更新一些 UI 目前没用到
    this.onLineChange?.(index)
  }

  /**
   * 平滑滚动到指定行（居中显示） 让高亮的那行歌词处于容器的正中央
   * @param index 目标行号
   * @param immediate 是否瞬间跳转（不带动画）
   */
  private scrollToLine(index: number, immediate: boolean = false): void {
    //交互冲突处理 不和用户的滚动抢
    if (this.isUserScrolling && !immediate) return
    //安全检查
    if (!this.lineElements[index]) return

    //拿到lineElements数组中的div 也就是DOM元素，上面render()刚存入的，不用querySelector了
    const lineEl = this.lineElements[index]
    const containerHeight = this.container.clientHeight // 容器视口高度
    const lineTop = lineEl.offsetTop // 这一行距离内容顶部的距离
    const lineHeight = lineEl.clientHeight // 这一行自身的高度
    // 目标滚动位置 = 元素顶部位置 - 容器一半高度 + 元素一半高度
    // 结果就是：元素的中心点与容器的中心点重合
    const targetScroll = lineTop - containerHeight / 2 + lineHeight / 2

    //执行滚动
    if (immediate) {
      //立马滚动 刚加载完或者用户点击跳转时 scrollTop: 容器滚动条滚下去的距离 可读写
      this.container.scrollTop = targetScroll
    } else {
      //使用 GSAP 动画库进行平滑滚动
      gsap.to(this.container, {
        scrollTop: targetScroll,
        duration: 0.4, //滚动动作耗时 0.4 秒完成
        ease: 'power2.out' // 让滚动有一种“快启动、慢刹车”的自然惯性
      })
    }
  }

  /**
   * 时间同步循环
   * 作用：每一帧（约16ms）检查当前播放时间和歌词进度
   */
  private timeLoop = (): void => {
    //如果暂停了，或者这首歌没有歌词，就停止空转
    if (!this.isPlaying || this.noTimestamp) return
    //获取当前播放时间
    const currentTime = this.audio.currentTime
    //二分查找算出当前时间对应行的index
    const index = this.findCurrentLine(currentTime)
    // 状态变更检测：
    // 二分查找算出来的这句index 和现在正在高亮的currentIndex一样吗 一样说明这16ms还没唱完，什么都不做，只有不一样时才去操作DOM
    // 这是一个极其重要的优化，避免每一帧都去操作 DOM (updateLine)
    if (index !== this.currentIndex) {
      this.updateLine(index)
    }
    // 请求浏览器在下一帧（约16ms后）再次执行 timeLoop  不是递归哦
    //当前执行栈：timeLoop 运行完这一帧的逻辑后，函数就正常结束了，栈帧弹出，内存清空
    //下一帧：过了约 16ms，浏览器发出信号，JS 引擎从事件队列里拿出预约好的 timeLoop，再次压入栈运行
    this.rafId = requestAnimationFrame(this.timeLoop)
  }
  /**
   * 启动引擎
   */
  private startLoop(): void {
    //防御性编程：防止重复启动导致开启多个循环
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }
    // 开始第一帧
    this.rafId = requestAnimationFrame(this.timeLoop)
  }
  /**
   * 熄火
   */
  private stopLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /**
   * 外部调用：开始播放
   */
  play(): void {
    if (this.noTimestamp) return
    this.isPlaying = true
    this.startLoop() //启动循环
  }

  /**
   * 外部调用：暂停
   */
  pause(): void {
    this.isPlaying = false
    this.stopLoop() // 停止循环
  }

  /**
   * 外部调用：同步当前行索引
   * 场景：用户拖拽了进度条 (Seek)，音乐瞬间跳到了 03:00
   * 此时必须要“立刻”更新歌词，不能等下一帧动画，否则会有延迟感
   */
  syncIndex(): void {
    if (this.noTimestamp) return
    //马上获取最新的时间
    const currentTime = this.audio.currentTime
    //马上算出新的行号
    const index = this.findCurrentLine(currentTime)
    // 强制更新 (true 参数)
    // 哪怕 index 没变，或者本来就在这行，也可能需要矫正滚动位置
    this.updateLine(index, true)

    // 恢复播放状态
    if (this.isPlaying) {
      this.startLoop()
    }
  }

  /**
   * 外部调用：获取当前行索引
   */
  getIndex(): number {
    return this.currentIndex
  }

  /**
   * 外部调用：获取播放状态
   */
  getPlayStatus(): boolean {
    return this.isPlaying
  }

  /**
   * 销毁实例
   * 场景：切歌、关闭播放器页面、组件卸载
   */
  destroy(): void {
    //停止循环，防止组件没了代码还在跑
    this.stopLoop()
    // 移除事件监听（非常重要！）
    // 如果不移除，内存中会一直留着这个监听器，导致内存泄漏
    this.container.removeEventListener('wheel', this.handleWheel)
    this.container.removeEventListener('click', this.handleClick)
    //清理定时器
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer)
    }
    // 断开引用，帮助垃圾回收机制 (GC) 快速回收内存
    this.lineElements = []
    this.lyrics = []
  }
}
