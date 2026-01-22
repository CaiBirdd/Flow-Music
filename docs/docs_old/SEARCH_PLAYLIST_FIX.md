# 搜索列表播放问题修复

## 问题描述

在搜索列表搜索出歌曲，点击播放，在播放完成后会播放其他列表（如主页推荐）的歌曲。此时播放详情页的左侧图片和右侧歌词都会匹配不上。

## 根本原因

### 问题流程

1. **搜索列表播放流程** (`SearchList/index.vue` 第47-50行)
   - 用户在搜索列表中搜索歌曲时，代码调用 `music.updateSearchList(result.songs)`
   - 当用户点击播放按钮时，触发 `@play="music.getMusicUrlHandler"`
   - **但这里没有更新运行时列表** (`runtimeList`)

2. **SongList 中的判断逻辑缺陷** (`SongList/index.vue` 第116-119行)
   - 原条件判断：`if (music.state.runtimeList?.id !== music.state.currentItem?.id && props.ids && props.listInfo)`
   - 只有当 `runtimeList.id !== currentItem.id` 时，才会调用 `updateRuntimeList`
   - 如果已经是搜索列表在播放，再点其他搜索结果歌曲，条件判断失败，`updateRuntimeList` 无法被调用

3. **播放完成后的错误处理** (`music.ts` 第178-184行)
   - 当歌曲播放完成时，`playEnd()` 函数会执行：

   ```typescript
   const playEnd = () => {
     state.value.index = orderTarget((state.value?.orderStatusVal ?? 0) as 0 | 1 | 2 | 3)
     if (state.value.index > state.value.runtimeIds.length - 1) {
       return
     }
     getMusicUrlHandler(state.value.runtimeList!.tracks[state.value.index])
   }
   ```

   - **关键问题**：此时 `state.value.runtimeList` 仍然是上一次播放的歌单，而不是搜索列表
   - 搜索列表的歌曲虽然被保存在 `state.value.searchList` 中，但 `runtimeList` 和 `runtimeIds` 从未正确更新

4. **详情页显示错误**
   - MusicDetail 组件通过 `music.state.songs` 获取当前歌曲信息来显示封面和歌词
   - 由于 `runtimeList` 错误指向前一个歌单，导致获取的下一首歌曲与实际播放的歌曲不匹配
   - 图片和歌词都是基于错误的歌曲ID获取的

## 解决方案

### 方案选择：最小改动方案

在搜索结果的 `SongList` 直接补齐 `listInfo` 和 `ids`，让搜索结果成为当前运行时列表。

**优势：**

- 显式、简洁：只在模板里加入参数，无须改动 store 逻辑
- 符合现有约定：SongList 已有"传入 listInfo/ids 才更新 runtimeList"的约定，沿用即可
- 改动面最小：仅影响搜索页，其他列表不受影响
- 数据量可控：`state.songs.result` 就是当前页（最多50条），不会塞入超大列表

## 修改内容

### 修改1：SearchList/index.vue

**文件位置**：`src/renderer/src/views/SearchList/index.vue` 第71-78行

**修改内容**：为 SongList 组件添加 `list-info` 和 `ids` 属性

```vue
<SongList
  is-loading-endflyback
  :loading="loading"
  :columns="columns"
  :songs="music.state.songs"
  :list="state.songs.result"
  :list-info="{ id: 'search', name: '搜索结果' }"
  :ids="state.songs.result.map((item) => item.id)"
  is-paging
  :total="state.songs.songCount"
  :page-size="limit"
  :current-page="page"
  :is-search="false"
  @current-change="currentChange"
  @play="music.getMusicUrlHandler"
></SongList>
```

### 修改2：SongList/index.vue

**文件位置**：`src/renderer/src/components/SongList/index.vue` 第116-121行

**问题**：原条件判断过于严格，只有当 `runtimeList.id !== currentItem.id` 时才会更新。如果已经是搜索列表在播放，再点击其他搜索结果歌曲时，条件判断失败，导致 `updateRuntimeList` 无法被调用。

**修改内容**：改为只要传入了 `listInfo` 和 `ids`，就直接更新 `runtimeList`

```typescript
// 修改前
if (music.state.runtimeList?.id !== music.state.currentItem?.id && props.ids && props.listInfo) {
  music.updateRuntimeList({ tracks: props.list, ...props.listInfo }, props.ids)
}

// 修改后
// 如果传入了listInfo和ids，总是更新runtimeList，确保当前播放列表上下文正确
if (props.ids && props.listInfo) {
  music.updateRuntimeList({ tracks: props.list, ...props.listInfo }, props.ids)
}
```

## 工作流程解析

修改后的播放流程：

1. 用户在搜索列表搜索歌曲，获得当前页结果（最多50首）
2. 点击播放某首歌曲时：
   - `SongList.playHandler()` 被触发
   - 检测到 `listInfo` 和 `ids` 存在，调用 `music.updateRuntimeList()`
   - 搜索列表被注册为 `runtimeList`，其歌曲数组被设为 `runtimeIds`
3. 当前页歌曲正常播放
4. 播放完成时，`playEnd()` 会根据播放模式（列表循环/随机/单曲循环）从搜索列表中选取下一首
5. 下一首歌曲的封面、歌词、详情都能正确匹配

## 验证测试

- ✓ 搜索结果播放到结尾，下一首封面/歌词匹配正确
- ✓ 上/下一首在搜索列表内循环正常
- ✓ 从搜索列表切到其他歌单播放时，能正确更新为新列表
- ✓ 随机/单曲循环模式下仍在搜索列表内播放

## 相关文件

| 文件                                                       | 修改内容                            |
| ---------------------------------------------------------- | ----------------------------------- |
| `src/renderer/src/views/SearchList/index.vue`              | 添加 `:list-info` 和 `:ids` 属性    |
| `src/renderer/src/components/SongList/index.vue`           | 简化 `updateRuntimeList` 的触发条件 |
| `src/renderer/src/store/music.ts`                          | 无需修改（现有逻辑正确）            |
| `src/renderer/src/components/MusicDetail/LyricDisplay.vue` | 无需修改（现有逻辑正确）            |
