# Git 未提交变更总结

> 日期：2026-01-07  
> 变更规模：873 行新增，642 行删除，18 个文件修改

---

## 1. 登录弹窗触发方式重构

**涉及文件：**

- `store/flags.ts`
- `store/index.ts`
- `layout/BaseAside/index.vue`
- `App.vue`

**变更内容：**

- 在 `flags.ts` 中新增 `isOpenLogin` 状态标志
- 登录触发方式由命令式 `window.$login.show()` 改为 Pinia 状态驱动 `flags.isOpenLogin = true`
- `<Login>` 组件移除 `ref="login"` 属性，改为响应 `isOpenLogin` 状态

**目的：** 将登录弹窗从命令式调用改为状态驱动的响应式控制，符合 Vue 组件通信最佳实践

---

## 2. 快捷键时间控制修复

**涉及文件：**

- `utils/shortcutKey.ts`

**变更内容：**

```diff
- window.$audio.time += 10
+ window.$audio.el.currentTime += 10
```

**目的：** 直接操作 audio 元素的 `currentTime` 属性，确保快进/快退功能正常工作

---

## 3. 歌词解析优化

**涉及文件：**

- `utils/lyric/parser.ts`

**变更内容：**

- 翻译歌词匹配逻辑重构
- 先进行精确时间匹配
- 若精确匹配失败，进行容差匹配（0.5秒内视为同一句）

**目的：** 提高翻译歌词与原歌词的时间匹配精度，解决翻译歌词不同步问题

---

## 4. 歌词播放器资源清理

**涉及文件：**

- `utils/lyric/player.ts`

**变更内容：**

- `destroy()` 方法增强：
  - 清理滚动定时器
  - 断开 `lineElements` 和 `lyrics` 数组引用
  - 移除事件监听器

**目的：** 防止内存泄漏，帮助 GC 快速回收内存

---

## 5. listener.ts 简化

**涉及文件：**

- `components/MusicPlayer/listener.ts`

**变更内容：**

- 移除 `pauseSomethingListener` 函数
- 移除 `playSomethingListener` 函数
- 保留核心的 `addListener` 和 `executeListener` 功能

**目的：** 简化 listener 模块，移除未使用的暂停/播放监听器功能

---

## 6. MusicPlayer 组件优化

**涉及文件：**

- `components/MusicPlayer/index.vue`

**变更内容：**

- 新增 `@seeked` 事件监听，触发时调用 `player?.syncIndex()` 同步歌词位置
- 新增 `seeked()` 函数处理进度条拖动后的歌词同步
- `onUnmounted` 钩子增强资源清理：
  - 清理音量渐变定时器 `clearInterval(timer)`
  - 销毁歌词播放器实例 `player.destroy()`
  - 清理 DOM 事件引用 `audio.value.oncanplay = null`

**目的：** 确保进度条拖动后歌词能立即同步，同时防止组件卸载时的内存泄漏

---

## 7. 删除歌曲功能优化

**涉及文件：**

- `components/MusicPlayer/useMusic.ts`

**变更内容：**

- 优化 `deleteSongHandler` 逻辑
- 添加删除成功后的 `ElMessage.success('删除成功')` 提示

**目的：** 提升用户体验，给予明确的操作反馈

---

## 8. 移除代理URL转换功能

**涉及文件：**

- `utils/index.ts`
- `views/SearchList/config.ts`

**变更内容：**

- 移除 `convertToProxyUrl` 函数
- 下载链接直接使用原始 URL，不再经过代理服务器转换

```diff
- const url = convertToProxyUrl(data[0].url)
+ const url = data[0].url
```

**目的：** 简化下载流程，移除对 `neonic.top/music-proxy` 代理服务的依赖

---

## 9. 歌词样式优化

**涉及文件：**

- `utils/lyric/style.scss`

**变更内容：**

- 新增 `will-change: transform, filter` 提示浏览器优化渲染层
- 非高亮歌词添加 `filter: blur(0.8px)` 模糊效果
- hover 状态时移除模糊 `filter: blur(0)`
- 高亮行 `.active` 状态新增：
  - `filter: blur(0)` 清晰显示
  - `transform: scale(1.02)` 微放大效果
  - `transform-origin: left center` 左对齐放大

**目的：** 提升歌词视觉层次感，高亮行更突出，非当前行模糊化减少视觉干扰

---

## 10. PlayListDrawer 组件优化

**涉及文件：**

- `components/PlayListDrawer/index.vue`

**变更内容：**

- 移除 `Props` 接口定义和 `computed` 导入，简化组件结构
- 新增 `useFlags` 导入，使用 Pinia 状态控制抽屉开关
- CSS 性能优化：
  - `backdrop-filter: blur()` 从 60px 降到 40px
  - 新增 `will-change: transform, backdrop-filter` GPU 预优化
  - 新增 `backface-visibility: hidden` 启用硬件加速
  - 新增 `contain: layout style` 限制重绘范围

**目的：** 简化组件代码，提升抽屉滑动动画的渲染性能

---

## 文件变更清单

| 文件路径                                               | 变更类型 |
| ------------------------------------------------------ | -------- |
| `src/renderer/src/App.vue`                             | 修改     |
| `src/renderer/src/api/musicList.ts`                    | 修改     |
| `src/renderer/src/components/MusicPlayer/Volume.vue`   | 修改     |
| `src/renderer/src/components/MusicPlayer/index.vue`    | 修改     |
| `src/renderer/src/components/MusicPlayer/listener.ts`  | 修改     |
| `src/renderer/src/components/MusicPlayer/useMusic.ts`  | 修改     |
| `src/renderer/src/components/PlayListDrawer/index.vue` | 修改     |
| `src/renderer/src/components/SongList/index.vue`       | 修改     |
| `src/renderer/src/layout/BaseAside/index.vue`          | 修改     |
| `src/renderer/src/store/flags.ts`                      | 修改     |
| `src/renderer/src/store/index.ts`                      | 修改     |
| `src/renderer/src/store/music.ts`                      | 修改     |
| `src/renderer/src/utils/index.ts`                      | 修改     |
| `src/renderer/src/utils/lyric/parser.ts`               | 修改     |
| `src/renderer/src/utils/lyric/player.ts`               | 修改     |
| `src/renderer/src/utils/lyric/style.scss`              | 修改     |
| `src/renderer/src/utils/shortcutKey.ts`                | 修改     |
| `src/renderer/src/views/SearchList/config.ts`          | 修改     |
