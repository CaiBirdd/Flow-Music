# 歌曲详情页性能优化

## 问题描述

### 问题一：点击打开详情页卡顿

**现象**：项目启动后使用一段时间，点击底部播放栏左侧的歌曲图片打开详情页时非常卡顿，内存会增长到 1.2~1.3GB。

**特点**：

- 刚启动时点击比较流畅
- 切歌后再点击就会卡顿
- 在详情页内切歌反而流畅

### 问题二：详情页封面不匹配

**现象**：在详情页关闭时切歌，然后点击图片打开详情页，左侧封面图片显示的是旧歌曲，但右侧歌词是正确的。

## 问题根源分析

### 根本原因：组件隐藏而非销毁

在 `App.vue` 中，`MusicDetail` 组件的显示/隐藏使用的是 CSS 动画：

```vue
<MusicDetail v-model="flags.isOpenDetail" />
```

```scss
.container {
  visibility: hidden;
  transform: translateY(100%);
}
.container.open {
  transform: translateY(0);
  visibility: visible;
}
```

**关键问题**：组件使用 CSS `transform` + `visibility` 隐藏，**从未真正销毁**，导致：

1. `onUnmounted` 里的清理代码**永远不会执行**
2. 组件内的 `watch` 在详情页关闭时仍然响应歌曲切换
3. 后台持续执行高开销的渲染操作

### 问题一分析：后台空耗资源

#### FlowBg.vue - 后台执行高开销操作

```typescript
// 问题代码：无论详情页是否打开，每次切歌都执行
watch([() => props.bg, () => settings.state.lyricBg], ([bg, lyricBg]) => {
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

- 每次切歌都执行 Canvas 绘图、Base64 编码、CSS 规则操作
- `will-change: filter` 让浏览器为隐藏元素预留 GPU 显存
- 显存碎片化，打开详情页时 GPU 任务积压导致卡顿

#### LyricDisplay.vue - 后台加载大图

```typescript
// 问题代码：无论详情页是否打开，每次切歌都加载 600x600 大图
watch(() => props.bg, async (val) => {
  currentTimeline = gsap.timeline()
  currentTimeline.to(bgEl, {...})
  toggleImg(val, '600y600').then(...)  // 每次都加载大图！
})
```

### 问题二分析：异步竞态条件

当用户快速操作（切歌 → 打开详情页）时：

1. 切歌 → `props.bg` 变化 → watch 触发
2. 因为详情页关闭，跳过渲染
3. 用户打开详情页 → 唤醒机制触发 → 开始加载图片
4. `toggleImg` 是异步的，如果此时又切歌，可能导致：
   - 旧的异步回调用旧图片覆盖新图片
   - `immediate` 模式下 GSAP `duration=0` 的 `onStart` 回调时机不稳定

## 修复方案

### 修复一：休眠机制

核心思路：**只有详情页打开时才执行重渲染，关闭时进入"休眠"状态**。

#### FlowBg.vue

```typescript
import { useFlags } from '@/store/flags'
const flags = useFlags()

// 完整渲染（详情页打开时）
const executeFullRender = (bg: string, lyricBg: string) => {
  toggleImg(bg, '200y200').then((img) => {
    // 颜色提取 + 渐变背景 + 节律背景
  })
}

// 轻量渲染（详情页关闭时，仅提取颜色给底部栏用）
const executeLightRender = (bg: string) => {
  toggleImg(bg, '200y200').then((img) => {
    // 仅颜色提取，不操作 Canvas/CSS/DOM
  })
}

// 切歌时
watch([() => props.bg, () => settings.state.lyricBg], ([bg, lyricBg]) => {
  if (!flags.isOpenDetail) {
    executeLightRender(bg) // 休眠：轻量渲染
    return
  }
  executeFullRender(bg, lyricBg) // 完整渲染
})

// 唤醒：打开详情页时补做完整渲染
watch(
  () => flags.isOpenDetail,
  (isOpen) => {
    if (isOpen && props.bg) {
      executeFullRender(props.bg, settings.state.lyricBg)
    }
  }
)
```

#### LyricDisplay.vue

```typescript
watch(
  () => props.bg,
  async (val) => {
    if (!flash.isOpenDetail) {
      // 休眠：只清理旧动画，不加载大图
      if (currentTimeline) {
        currentTimeline.kill()
        currentTimeline = null
      }
      return
    }
    executeCoverAnimation(val) // 完整渲染
  }
)

// 唤醒
watch(
  () => flash.isOpenDetail,
  (isOpen) => {
    if (isOpen && props.bg) {
      executeCoverAnimation(props.bg, true)
    }
  }
)
```

### 修复二：竞态条件检测

```typescript
// 追踪当前加载的图片URL
let currentLoadingBg: string | null = null

const executeCoverAnimation = (val: string, immediate: boolean = false) => {
  currentLoadingBg = val // 记录当前加载的URL

  toggleImg(val, '600y600').then((img) => {
    // 竞态检测：如果URL已变，丢弃结果
    if (currentLoadingBg !== val) return

    // immediate 模式优化：直接设置样式，不依赖 GSAP onStart
    if (immediate && coverElRef) {
      coverElRef.style.backgroundImage = `url(${img.src})`
      bgElRef.style.height = '45vh'
      bgElRef.style.width = '45vh'
      return
    }
    // ... 正常动画
  })
}
```

### 修复三：删除无效的 onUnmounted

由于组件永不销毁，`onUnmounted` 中的清理代码永不执行，属于冗余代码，已删除：

- `FlowBg.vue`：删除 `onUnmounted` 及相关变量 (`rhythmCleanup`, `stopWatchBg`, `stopWatchOpen`)
- `LyricDisplay.vue`：删除 `onUnmounted` 及相关变量 (`stopWatchPlay`, `stopWatchBg`, `stopWatchOpen`)

## 修复文件清单

| 文件                                                       | 修改内容                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `src/renderer/src/components/MusicDetail/FlowBg.vue`       | 添加休眠机制，删除无效 onUnmounted                          |
| `src/renderer/src/components/MusicDetail/LyricDisplay.vue` | 添加休眠机制、竞态检测、immediate优化，删除无效 onUnmounted |

## 修复原理图解

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
│  打开详情页 → 唤醒机制触发 → 补做完整渲染（带竞态检测）        │
└─────────────────────────────────────────────────────────────┘
```

## 经验总结

### 关于 onUnmounted 的误区

之前的内存泄漏修复文档（`MEMORY_LEAK_FIX.md`）假设组件会销毁，在 `onUnmounted` 中添加了清理代码。但实际上：

- `MusicDetail` 使用 CSS 隐藏，**永不销毁**
- `onUnmounted` 里的代码**一次都没执行过**
- 真正有效的是**运行时的休眠判断**

### 何时使用 onUnmounted vs 运行时判断

| 场景                               | 推荐方案           |
| ---------------------------------- | ------------------ |
| 组件使用 `v-if` 条件渲染           | `onUnmounted` 清理 |
| 组件使用 CSS 隐藏 (`v-show`/class) | **运行时休眠判断** |
| 全局单例组件（始终挂载）           | **运行时休眠判断** |

### 异步操作的竞态处理

在 Vue 中处理异步操作时，要考虑：

1. 异步完成时，状态可能已经变化
2. 使用"版本号"或"当前值"来检测竞态
3. `immediate` 模式下避免依赖不稳定的回调时机

---

## 日期

- 修复日期: 2026-01-03
