# 音乐播放器原理：切歌与播放模式切换全链路解析

在音乐播放器中，切歌（上一首/下一首）以及自动播放下一首不仅涉及到数组的简单加减，还需要处理不同播放模式（列表循环、随机播放、单曲循环）下的分发逻辑，以及随机播放特有的“历史路径回退”需求。

以下基于项目中 `store/music.ts` 的源码，详细拆解整个切歌链路。

## 1. 核心状态依赖与数据结构

在执行任何切歌动作之前，Pinia Store 中维护了几个关键状态：

- `playQueueIds`: 当前播放队列的所有歌曲 ID 数组。
- `index`: 当前正在播放的歌曲在队列中的整数下标。
- `orderStatusVal`: 播放模式枚举值（`0`: 列表循环, `1`: 随机播放, `2`: 单曲循环）。
- `lastIndexList`: **随机播放时的历史记录栈**（这是随机模式下保证“上一首”能听还原歌曲的关键）。

## 2. 关键机制：基于 `watch` 的历史记录栈

在随机播放模式下，如果简单地产生一个随机数作为下一首歌，那么当用户点击“上一首”时，系统是无法知道刚才随机到的是哪首的。项目中巧妙利用了 Vue 响应式系统的 `watch` 函数自动记录历史：

```typescript
/**
 * 监听歌曲下标变化，记录播放历史
 * 只要 index 变了（切歌了），就把旧的 index (oldValue) 存进历史记录栈
 */
watch(
  () => state.value.index,
  (value, oldValue) => {
    state.value.lastIndexList.push(oldValue)
  }
)
```

不论是自然播放结束、手动切歌还是点击列表切歌，只要 `index` 发生变更，旧的下标必然会被自动推入 `lastIndexList` 结尾。

## 3. 手动切歌主控方法：`cutSongHandler`

当用户在 UI 上点击了“上一首”或“下一首”按钮时，触发的都是这个方法。入参 `target` 若为 `true` 代表下一首，`false` 代表上一首。

### 3.1 列表循环(0) / 单曲循环(2) 模式下的手动切歌

如果是这两种模式，逻辑非常直接纯粹：**遇到边界强行绕回**。

> 注意：单曲循环模式下，**手动点击**“下一首”时，用户的意图通常是想换首歌，而不是继续听当前这首，所以在这里它的行为等同于“列表循环”。单曲循环只管“自然播放结束”的情况。

```typescript
// target: true = 下一首, false = 上一首
if (state.value.orderStatusVal === 0 || state.value.orderStatusVal === 2) {
  // 1. 指针偏移
  state.value.index = target ? state.value.index + 1 : state.value.index - 1

  // 2. 边界收尾处理（越界绕回）
  if (state.value.index > state.value.playQueueIds.length - 1) {
    state.value.index = 0 // 切下一首到头了，回第0首
  } else if (state.value.index < 0) {
    state.value.index = state.value.playQueueIds.length - 1 // 点上一首到负的了，去末尾
  }

  // 3. 执行真正的播放请求动作
  getMusicUrlHandler(state.value.playQueue!.tracks[state.value.index])
  return
}
```

### 3.2 随机播放(1) 模式下的手动切歌

随机模式最复杂，因为涉及到时空回溯（上一首）和探索未知（下一首）两套截然不同的逻辑。

#### 场景 A：点击了“上一首” (`!target`)

这需要把刚才存进 `lastIndexList` 里的路径“弹栈”恢复：

```typescript
if (!target) {
  // 1. 尝试从历史记录栈中拿出最近的一个索引
  // 2. 如果栈空了(?? 语法)，说明刚打开应用没听过上一首，那降级为随机挑选一个
  const i =
    state.value.lastIndexList[state.value.lastIndexList.length - 1] ??
    orderTarget(state.value?.orderStatusVal as 0 | 1 | 2)

  // 3. 播放拿到索引的这首历史歌曲
  getMusicUrlHandler(state.value.playQueue!.tracks[i])

  // 4. 【重要】“消费”掉这个历史记录，把它从栈里移走，防止陷入时光死循环
  state.value.lastIndexList.splice(state.value.lastIndexList.length - 1)
  return
}
```

#### 场景 B：点击了“下一首”

下一首的逻辑非常简单，随机选个新的就行了，这和一首歌自己长路漫漫播放完的逻辑是完全**等价**的，因此复用了自然播放结束的逻辑：

```typescript
// 如果是点“下一首”，直接使用自然播放结束的逻辑 (生成一个新的随机下一首)
playEnd()
```

## 4. 自然终老的闭环：`playEnd` 与 `orderTarget`

全屏 `<audio>` 标签自身引发了 `@ended` 事件后，会触发 `playEnd` 走自动下一首。

这里用到了一个万能计算器 `orderTarget`：

```typescript
const orderTarget = (i: 0 | 1 | 2) => {
  if (i === 0) {
    // 列表循环: 下一首 (加1并对总长度取模，完美实现越界绕回 0)
    return (state.value.index + 1) % state.value.playQueueIds.length
  } else if (i === 1) {
    // 随机播放: 给出一个 0 ~ length-1 的真随机整数
    return randomNum(0, state.value.playQueueIds.length - 1)
  } else {
    // 【区别所在】单曲循环: 当自然播放完毕时，不移动下标，仍然返回当前的 index
    return state.value.index
  }
}
```

最终 `playEnd` 的代码简明扼要：

```typescript
const playEnd = () => {
  // 去 orderTarget 里算出下一首该轮到谁
  state.value.index = orderTarget((state.value?.orderStatusVal ?? 0) as 0 | 1 | 2)

  // 安全拦截：防止列表被清空时的越界崩溃
  if (state.value.index > state.value.playQueueIds.length - 1) {
    return
  }

  // 触发主干播放动作
  getMusicUrlHandler(state.value.playQueue!.tracks[state.value.index])
}
```

## 总结

综上所述，项目的切歌系统围绕着 `下标改变 -> 记录历史 -> 选出新目标 -> 发起请求` 这一闭环运作。特别是：

1. **巧妙地将 单曲循环 的“手动点击下一首”等同于列表循环逻辑处理，从而满足了真实用户的心理预期。**
2. **巧妙利用 Vue `watch` 系统自动收集了难以手动维护的无规律“随机播放历史线”。**
3. **将手动切下一首与自然结束 `@ended` 的底层逻辑做了优雅复用。**
