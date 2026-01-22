# 内存泄漏修复优化

## 问题描述

应用在使用过程中内存占用持续增长：

- 初始启动: ~500MB
- 使用10-15分钟后: ~1.2GB

同时出现功能问题：歌曲详情页的图片和歌词偶尔不随歌曲切换更新。

## 问题根源分析

### 1. 定时器未清理

**Search/index.vue** - 递归 setTimeout 永不停止

```typescript
// 问题代码
const getSearchDefault = async () => {
  const { data } = await searchDefault()
  // ...
  setTimeout(getSearchDefault, 30000) // 递归调用，永不停止
}
getSearchDefault()
```

每30秒创建一个新的定时器，组件销毁后仍在运行，导致：

- 定时器累积
- 闭包引用无法释放
- 网络请求持续发送

### 2. Watch 监听器未停止

**LyricDisplay.vue / FlowBg.vue** - 在 `nextTick` 或 `onMounted` 中创建的 watch 没有保存停止句柄

```typescript
// 问题代码
nextTick(() => {
  watch(
    () => props.bg,
    (val) => {
      // 处理逻辑
    }
  )
  // watch 没有保存返回的 stop 函数
})
```

虽然 Vue 会在组件卸载时自动停止 watch，但在某些情况下（如组件重新渲染但未完全卸载），这些 watch 可能继续运行。

### 3. GSAP 动画未清理

**LyricDisplay.vue** - 每次切换歌曲都创建新的 timeline，旧动画未被清理

```typescript
// 问题代码
watch(
  () => props.bg,
  async (val) => {
    const tl = gsap.timeline() // 每次都创建新实例
    tl.to(bgEl, {
      /* ... */
    })
    // 旧的 timeline 未被 kill()
  }
)
```

GSAP 动画实例会持有 DOM 元素引用，未清理会导致内存泄漏。

### 4. LyricPlayer 未销毁

**MusicPlayer/index.vue** - LyricPlayer 实例只创建不销毁

```typescript
// 问题代码
let player: LyricPlayer | null = null

function initPlayer() {
  if (player) return // 已存在则直接返回，不更新
  // ...
}
// 缺少 onUnmounted 清理
```

LyricPlayer 内部保存了事件监听器和 DOM 引用，未调用 `destroy()` 会导致资源泄漏。

### 5. 数组持续增长

**store/music.ts** - lastIndexList 没有长度限制

```typescript
// 问题代码
watch(
  () => state.value.index,
  (value, oldValue) => {
    state.value.lastIndexList.push(oldValue) // 无限增长
  }
)
```

播放历史记录持续累积，长时间使用后会占用大量内存。

### 6. Image 对象事件处理器未清理

**utils/index.ts** - toggleImg 创建的 Image 对象事件未清理

```typescript
// 问题代码
img.onload = () => {
  resolve(img)
  // onload 和 onerror 仍然引用闭包
}
```

事件处理器会保持对闭包的引用，阻止垃圾回收。

## 修复方案

### 1. Search/index.vue - 定时器清理

```typescript
// 保存定时器ID
let searchDefaultTimer: ReturnType<typeof setTimeout> | null = null

const getSearchDefault = async () => {
  const { data } = await searchDefault()
  // ...
  if (searchDefaultTimer) {
    clearTimeout(searchDefaultTimer)
  }
  searchDefaultTimer = setTimeout(getSearchDefault, 30000)
}

// 组件卸载时清理
onUnmounted(() => {
  if (searchDefaultTimer) {
    clearTimeout(searchDefaultTimer)
    searchDefaultTimer = null
  }
})
```

### 2. LyricDisplay.vue - Watch 和 GSAP 清理

```typescript
// 保存停止句柄和动画实例
let stopWatchPlay: WatchStopHandle | null = null
let stopWatchBg: WatchStopHandle | null = null
let currentTimeline: gsap.core.Timeline | null = null

nextTick(() => {
  stopWatchBg = watch(
    () => props.bg,
    async (val) => {
      // 清理上一个动画
      if (currentTimeline) {
        currentTimeline.kill()
      }
      currentTimeline = gsap.timeline()
      // ...
    }
  )
})

onUnmounted(() => {
  stopWatchPlay?.()
  stopWatchBg?.()
  if (currentTimeline) {
    currentTimeline.kill()
    currentTimeline = null
  }
})
```

### 3. MusicPlayer/index.vue - LyricPlayer 销毁

```typescript
function initPlayer() {
  const container = document.querySelector('.lyric-container')
  if (!container || !audio.value) return

  // 如果已存在，先销毁旧实例
  if (player) {
    player.destroy()
  }

  player = new LyricPlayer({
    container,
    audio: audio.value,
    onLineClick: handleLyricClick
  })
}

onUnmounted(() => {
  clearInterval(timer)
  if (player) {
    player.destroy()
    player = null
  }
  // 移除事件监听器
  if (audio.value && audioErrorHandler) {
    audio.value.removeEventListener('error', audioErrorHandler)
  }
  if (audio.value) {
    audio.value.oncanplay = null
  }
})
```

### 4. store/music.ts - 限制数组长度

```typescript
watch(
  () => state.value.index,
  (value, oldValue) => {
    state.value.lastIndexList.push(oldValue)
    // 限制历史记录最大长度
    const MAX_HISTORY_LENGTH = 100
    if (state.value.lastIndexList.length > MAX_HISTORY_LENGTH) {
      state.value.lastIndexList = state.value.lastIndexList.slice(-MAX_HISTORY_LENGTH)
    }
  }
)
```

### 5. FlowBg.vue - Watch 停止句柄

```typescript
let stopWatchBg: WatchStopHandle | null = null

onMounted(() => {
  const { splitImg, cleanup } = useRhythm(rhythmBox)
  rhythmCleanup = cleanup

  // 保存 watch 停止句柄
  stopWatchBg = watch([() => props.bg, () => settings.state.lyricBg], ([bg, lyricBg]) => {
    // ...
  })
})

onUnmounted(() => {
  stopWatchBg?.()
  rhythmCleanup?.()
})
```

### 6. utils/index.ts - Image 事件清理

```typescript
export function toggleImg(src: string, size?: string): Promise<HTMLImageElement> {
  // ...
  return new Promise((resolve, reject) => {
    img.onload = () => {
      // 清理事件处理器，帮助垃圾回收
      img.onload = null
      img.onerror = null
      resolve(img)
    }
    img.onerror = () => {
      img.onload = null
      img.onerror = null
      reject(new Error(`Failed to load image: ${src}`))
    }
  })
}
```

## 修复文件清单

| 文件                                                       | 问题              | 修复方式        |
| ---------------------------------------------------------- | ----------------- | --------------- |
| `src/renderer/src/components/Search/index.vue`             | setTimeout递归    | 添加定时器清理  |
| `src/renderer/src/components/MusicDetail/LyricDisplay.vue` | Watch/GSAP未清理  | 保存句柄并清理  |
| `src/renderer/src/components/MusicPlayer/index.vue`        | LyricPlayer未销毁 | 添加destroy调用 |
| `src/renderer/src/store/music.ts`                          | 数组无限增长      | 限制最大长度    |
| `src/renderer/src/components/MusicDetail/FlowBg.vue`       | Watch未清理       | 保存停止句柄    |
| `src/renderer/src/utils/index.ts`                          | Image事件未清理   | 清理事件处理器  |

## 内存泄漏排查技巧

### 1. Chrome DevTools Memory 面板

1. 打开 DevTools → Memory 面板
2. 选择 "Heap snapshot"
3. 操作应用（如切换几首歌曲）
4. 再次拍摄快照
5. 比较两个快照，查看增长的对象

### 2. Performance Monitor

1. DevTools → More tools → Performance Monitor
2. 观察 JS heap size 变化趋势
3. 正常应用应该呈现锯齿状（有涨有降）
4. 持续上涨说明存在泄漏

### 3. 常见泄漏模式

- **定时器**: setInterval/setTimeout 未清理
- **事件监听器**: addEventListener 后未 removeEventListener
- **闭包**: 函数引用外部变量，阻止垃圾回收
- **DOM 引用**: JavaScript 对象持有 DOM 元素引用
- **全局变量**: 数据存储在全局对象中不断增长

## 预期效果

修复后的内存表现：

- 初始启动后内存稳定在 500-600MB
- 长时间使用（1小时以上）内存保持稳定
- 歌曲切换时内存有小幅波动，但会被垃圾回收

---

## 第二次修复 (搜索页面专项)

### 问题描述

用户反馈：在歌单页面播放歌曲内存保持正常(500-600MB)，但在搜索页面点击播放后内存逐渐增长。

### 问题分析

#### 1. Blob URL 未释放

**文件**: `src/renderer/src/views/SearchList/config.ts`

```typescript
// 问题代码
fetch(url)
  .then((response) => response.blob())
  .then((blob) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob) // 创建了 Blob URL
    link.download = name + '.mp3'
    link.click()
    // Blob URL 永远不会被释放！
  })
```

每次下载都会创建一个 Blob URL，但从未调用 `URL.revokeObjectURL()` 释放。Blob URL 会持有整个音频文件的二进制数据，累积后占用大量内存。

#### 2. downloadVisible 状态对象持续增长

**文件**: `src/renderer/src/views/SearchList/config.ts`

```typescript
// 问题代码
const downloadVisible = ref<Record<number, boolean>>({})
// 每次点击下载无音源的歌曲
downloadVisible.value[id] = true
// 对象持续增长，键永远不会被删除
```

#### 3. itemRefs DOM 引用累积

**文件**: `src/renderer/src/components/SongList/index.vue`

```typescript
// 问题代码
const itemRefs = ref<Record<number, HTMLDivElement>>({})
const setItemRef = (el: any, id: number) => {
  if (el) {
    itemRefs.value[id] = el.$el || el
    // 引用只增不减，即使列表项已被移除
  }
}
```

搜索结果每次翻页都会添加新的 DOM 引用，但旧引用从不清理。

#### 4. oncanplay 闭包累积

**文件**: `src/renderer/src/store/music.ts`

```typescript
// 问题代码
window.$audio.el.oncanplay = async () => {
  // 每次播放都创建新闭包
  // 旧的闭包被覆盖但可能未被GC
}
```

### 修复方案

#### 1. 释放 Blob URL

```typescript
fetch(url)
  .then((response) => response.blob())
  .then((blob) => {
    const link = document.createElement('a')
    const blobUrl = URL.createObjectURL(blob)
    link.href = blobUrl
    link.download = name + '.mp3'
    link.click()
    // 内存优化: 下载开始后释放 Blob URL
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl)
    }, 1000)
  })
```

#### 2. 简化 downloadVisible 状态

```typescript
// 只保存当前正在处理的ID，而不是所有历史记录
const downloadVisible = ref<number | null>(null)

// 使用时
downloadVisible.value = id // 显示弹窗
downloadVisible.value = null // 关闭弹窗
```

#### 3. 清理不再需要的 itemRefs

```typescript
const setItemRef = (el: any, id: number) => {
  if (el) {
    itemRefs.value[id] = el.$el || el
  } else {
    // 元素被卸载时删除引用
    delete itemRefs.value[id]
  }
}

// 在列表更新时清理
watch(
  () => props.list,
  (val) => {
    filterList.value = val
    // 清理不再存在的项的DOM引用
    const currentIds = new Set(val.map((item) => item.id))
    Object.keys(itemRefs.value).forEach((key) => {
      const id = Number(key)
      if (!currentIds.has(id)) {
        delete itemRefs.value[id]
      }
    })
  }
)
```

#### 4. 清理旧的 oncanplay 处理器

```typescript
// 先清理旧的处理器
window.$audio.el.oncanplay = null
window.$audio.el.oncanplay = async () => {
  try {
    await window.$audio.play()
  } catch (error) {
    console.error('播放失败:', error)
  }
}
```

### 本次修复文件清单

| 文件                                             | 问题          | 修复方式                  |
| ------------------------------------------------ | ------------- | ------------------------- |
| `src/renderer/src/views/SearchList/config.ts`    | Blob URL 泄漏 | 添加 revokeObjectURL 调用 |
| `src/renderer/src/views/SearchList/config.ts`    | 状态对象增长  | 改用单值状态              |
| `src/renderer/src/components/SongList/index.vue` | DOM 引用累积  | 添加清理逻辑              |
| `src/renderer/src/store/music.ts`                | 闭包累积      | 先置 null 再赋值          |

### 为什么搜索页面特别容易出问题

1. **高频操作**: 用户会频繁搜索、翻页、播放
2. **大量数据**: 搜索结果通常较多，每次都会创建新的 DOM 元素引用
3. **下载功能**: 只有搜索页面有下载按钮，Blob URL 泄漏只在这里发生
4. **列表切换**: 不像歌单页面，搜索结果每次都是全新的列表

---

## 第三次修复 (详情页休眠机制)

### 问题描述

用户反馈：项目启动后点击歌曲图片打开详情页比较流畅，但切歌后再点击就会卡顿。

### 问题根源

**之前的修复方案失效**：前两次修复主要在 `onUnmounted` 中进行资源清理，但 `MusicDetail` 组件使用 CSS `transform: translateY(100%)` + `visibility: hidden` 隐藏，**从未真正销毁**，导致：

1. `onUnmounted` 里的清理代码**一次都没执行过**
2. 组件内的 `watch` 在详情页关闭时仍然响应歌曲切换
3. 后台持续执行高开销的渲染操作

### 具体问题分析

#### 1. FlowBg.vue - 后台空耗 GPU 资源

```typescript
// 问题代码：无论详情页是否打开，每次切歌都执行
stopWatchBg = watch([() => props.bg, () => settings.state.lyricBg], ([bg, lyricBg]) => {
  toggleImg(bg, '200y200').then((img) => {
    colorExtraction(img)      // 颜色提取
    gradualChange(img, ...)   // 更新渐变背景 DOM
    if (lyricBg === 'rhythm') {
      splitImg(img)           // Canvas 绘图 + toDataURL + CSS规则插入
    }
  })
})
```

**后果**：

- 详情页隐藏时，每次切歌都执行 Canvas 绘图、Base64 编码、CSS 规则操作
- `will-change: filter` 让浏览器为隐藏元素预留 GPU 显存
- 显存碎片化，打开详情页时 GPU 任务积压导致卡顿

#### 2. LyricDisplay.vue - 后台加载大图

```typescript
// 问题代码：无论详情页是否打开，每次切歌都加载 600x600 大图
stopWatchBg = watch(() => props.bg, async (val) => {
  currentTimeline = gsap.timeline()
  currentTimeline.to(bgEl, {...})
  toggleImg(val, '600y600').then(...)  // 每次都加载大图！
})
```

**后果**：

- 详情页隐藏时，仍创建 GSAP 动画并加载 600x600 高清图
- 图片对象和动画实例累积，占用内存

### 修复方案 - 休眠机制

核心思路：**只有详情页打开时才执行重渲染，关闭时进入"休眠"状态**。

#### 1. FlowBg.vue 修复

```typescript
import { useFlags } from '@/store/flags'
const flags = useFlags()

// 完整渲染逻辑（详情页打开时执行）
const executeFullRender = (bg: string, lyricBg: string) => {
  toggleImg(bg, '200y200').then((img) => {
    rgb.value = colorExtraction(img)
    bestColors.value = findBestColors(rgb.value, 2)
    music.updateBgColor(bestColors.value)
    gradualChange(img, bestColors.value)
    if (lyricBg === 'rhythm' && rhythmBoxRef && splitImgFn) {
      splitImgFn(img)
    }
  })
}

// 轻量渲染（详情页关闭时执行，仅提取颜色给底部栏用）
const executeLightRender = (bg: string) => {
  toggleImg(bg, '200y200').then((img) => {
    rgb.value = colorExtraction(img)
    bestColors.value = findBestColors(rgb.value, 2)
    music.updateBgColor(bestColors.value)
  })
}

// 切歌时的 watch
stopWatchBg = watch([() => props.bg, () => settings.state.lyricBg], ([bg, lyricBg]) => {
  if (!bg) return

  // 【休眠机制】详情页关闭时只做轻量渲染
  if (!flags.isOpenDetail) {
    executeLightRender(bg)
    return
  }

  executeFullRender(bg, lyricBg)
})

// 【唤醒机制】详情页打开时补做完整渲染
stopWatchOpen = watch(
  () => flags.isOpenDetail,
  (isOpen) => {
    if (isOpen && props.bg) {
      executeFullRender(props.bg, settings.state.lyricBg)
    }
  }
)
```

#### 2. LyricDisplay.vue 修复

```typescript
// 封面动画逻辑
const executeCoverAnimation = (val: string, immediate: boolean = false) => {
  if (!bgElRef || !val) return
  if (currentTimeline) currentTimeline.kill()

  currentTimeline = gsap.timeline()
  if (!immediate) {
    currentTimeline.to(bgElRef, { height: '10vh', width: '10vh', ... })
  }
  toggleImg(val, '600y600').then((img) => {
    currentTimeline.to(bgElRef, {
      height: '45vh', width: '45vh',
      duration: immediate ? 0 : 0.3,
      onStart: () => { coverElRef.style.backgroundImage = `url(${img.src})` }
    })
  })
}

// 切歌时的 watch
stopWatchBg = watch(() => props.bg, async (val) => {
  if (!bgElRef || !val) return

  // 【休眠机制】详情页关闭时只清理旧动画，不加载大图
  if (!flash.isOpenDetail) {
    if (currentTimeline) {
      currentTimeline.kill()
      currentTimeline = null
    }
    return
  }

  executeCoverAnimation(val)
})

// 【唤醒机制】详情页打开时补做渲染
stopWatchOpen = watch(() => flash.isOpenDetail, (isOpen) => {
  if (isOpen && props.bg) {
    executeCoverAnimation(props.bg, true)  // immediate=true 跳过缩小动画
  }
})
```

### 本次修复文件清单

| 文件                                                       | 问题                     | 修复方式                |
| ---------------------------------------------------------- | ------------------------ | ----------------------- |
| `src/renderer/src/components/MusicDetail/FlowBg.vue`       | 后台执行 Canvas/CSS 操作 | 添加休眠判断 + 唤醒机制 |
| `src/renderer/src/components/MusicDetail/LyricDisplay.vue` | 后台加载大图和 GSAP 动画 | 添加休眠判断 + 唤醒机制 |

### 修复原理图解

```
修复前：
┌─────────────────────────────────────────────────────────────┐
│  切歌 → watch 触发 → 完整渲染（无论详情页是否打开）          │
│                     ↓                                        │
│         Canvas绘图 + CSS规则 + 大图加载 + GSAP动画           │
│                     ↓                                        │
│         GPU显存占用 + 任务积压 → 打开详情页时卡顿             │
└─────────────────────────────────────────────────────────────┘

修复后：
┌─────────────────────────────────────────────────────────────┐
│  切歌 → watch 触发 → 检查 flags.isOpenDetail                │
│                     ↓                                        │
│     ┌─────────────────────┬─────────────────────────────┐   │
│     │ 详情页关闭           │ 详情页打开                   │   │
│     │ → 轻量渲染(仅颜色)   │ → 完整渲染                   │   │
│     │ → 跳过Canvas/GSAP   │ → Canvas + 大图 + GSAP      │   │
│     └─────────────────────┴─────────────────────────────┘   │
│                                                              │
│  打开详情页 → 唤醒机制触发 → 补做完整渲染                     │
└─────────────────────────────────────────────────────────────┘
```

### 预期效果

- 详情页关闭时切歌：无 GPU 开销，无大图加载
- 打开详情页：流畅展开，背景和封面正确显示
- 内存占用：保持稳定，不会因后台操作而增长

### 补充修复：删除冗余 onUnmounted 代码

**问题发现**：由于 `MusicDetail` 组件使用 CSS `transform: translateY(100%)` + `visibility: hidden` 隐藏，组件从未真正销毁，导致：

1. `onUnmounted` 中的清理代码**从未执行过**
2. 保存的 `stopWatchBg`、`stopWatchOpen`、`stopWatchPlay`、`rhythmCleanup` 等变量都是冗余的

**修复方案**：删除永不执行的 `onUnmounted` 及相关变量：

```typescript
// 删除前（冗余代码）
import { onUnmounted } from 'vue'
let stopWatchBg: WatchStopHandle | null = null
let stopWatchOpen: WatchStopHandle | null = null

onUnmounted(() => {
  stopWatchBg?.()
  stopWatchOpen?.()
  // ...
})

// 删除后（简洁代码）
// 直接使用 watch，不再保存停止句柄
watch([...], ([bg, lyricBg]) => { ... })
watch(() => flags.isOpenDetail, (isOpen) => { ... })
```

**关键认知**：并非所有组件都需要 `onUnmounted` 清理，取决于组件是否真正被销毁。对于使用 CSS 隐藏的组件，应该采用"休眠机制"而非生命周期清理。

### 补充修复：封面图片竞态条件

**问题描述**：详情页关闭时切歌，再打开详情页时封面图片可能显示错误（显示上一首的封面）。

**问题根源**：

1. `toggleImg()` 是异步加载，旧图片的 Promise 可能在新图片之后 resolve
2. GSAP `timeline.to()` 的 `onStart` 回调在 `duration: 0` 时执行时机不稳定

**修复方案**：

```typescript
// 用于检测竞态条件
let currentLoadingBg = ''

const executeCoverAnimation = (val: string, immediate: boolean = false) => {
  // 记录当前加载的图片 URL，用于检测竞态条件
  currentLoadingBg = val

  toggleImg(val, '600y600').then((img) => {
    // 【竞态条件检测】如果加载完成时图片已变化，跳过更新
    if (currentLoadingBg !== val) return

    if (immediate) {
      // immediate 模式直接设置样式，避免 GSAP duration=0 时机问题
      coverElRef.style.backgroundImage = `url(${img.src})`
      bgElRef.style.height = '45vh'
      bgElRef.style.width = '45vh'
    } else {
      currentTimeline.to(bgElRef, {
        onStart: () => {
          coverElRef.style.backgroundImage = `url(${img.src})`
        }
      })
    }
  })
}
```

---

## 日期

- 首次修复日期: 2026-01-02
- 第二次修复日期: 2026-01-02 (搜索页面专项)
- 第三次修复日期: 2026-01-03 (详情页休眠机制)
- 第三次补充修复: 2026-01-03 (删除冗余 onUnmounted、修复封面竞态条件)
