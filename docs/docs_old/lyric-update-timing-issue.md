# 歌词更新时序问题分析与修复方案

## 问题描述

在歌曲详情页打开状态下，通过底部播放组件切歌时，偶发出现歌词没有更新的情况。

## 根本原因

`getLyricHandler` 是异步调用但没有等待完成，同时 `MusicPlayer` 组件也没有监听歌词变化来重新设置歌词。

### 问题代码

**`store/music.ts` - `getMusicUrlHandler` 函数：**

```typescript
const getMusicUrlHandler = async (item: GetMusicDetailData, i?: number) => {
  state.value.currentSong = item
  getLyricHandler(item.id) // ❌ 异步但没有 await
  getDynamicCoverHandler(item.id)
  // ...
  window.$audio.cutSongHandler() // ← 立即调用
}
```

**`MusicPlayer/index.vue` - `cutSongHandler` 函数：**

```typescript
const cutSongHandler = () => {
  initPlayer()
  player?.setLyrics(music.state.lyric, music.state.noTimestamp) // ← 此时可能还是旧歌词
  executeListener('cutSong')
}
```

### 问题时序

```
1. cutSongHandler(true) 被调用
2. getMusicUrlHandler(item) 执行
3. currentSong = item ✓
4. getLyricHandler(id) 异步开始（不等待）
5. cutSongHandler() 立即被调用
6. setLyrics(store.lyric) ❌ 此时 store.lyric 还是旧歌词
7. 新歌词返回，更新 store.lyric
8. 但没有任何机制重新调用 setLyrics！
```

## 触发条件

- 后端 API 响应慢（网络延迟、服务器高负载）
- 本地后端服务运行时间过长导致性能下降

## 修复方案

在 `MusicPlayer/index.vue` 的 `onMounted` 中添加 watch 监听歌词变化：

```typescript
import { watch } from 'vue'

onMounted(() => {
  initPlayer()

  // 监听歌词数据变化，自动重新设置歌词
  watch(
    () => music.state.lyric,
    (newLyric) => {
      if (player && newLyric) {
        player.setLyrics(newLyric, music.state.noTimestamp)
      }
    }
  )

  // ... 原有代码 ...
})
```

## 状态

- **当前状态**：未修复（暂不影响正常使用）
- **发现日期**：2026-01-14
- **优先级**：低（仅在 API 响应慢时触发）
