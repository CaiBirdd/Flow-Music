# 🎨 颜色算法深度解析 & JS 语法讲解

本文档提供了 `src/renderer/src/utils/index.ts` 中颜色选择算法的详细演练。不仅包含了**逐行中文注释**，还根据最新的代码**优化**，解释了如何通过预处理和逻辑简化来提升性能。

## 1. 🌈 `rgbToHsl`: 颜色格式转换

**目标**: 将颜色从计算机存储格式 "红/绿/蓝 (RGB)" 转换为人类感知的格式 "色相/饱和度/亮度 (HSL)"。这样做是因为用饱和度和亮度来计算“对比度”或“和谐度”要容易得多。

```typescript
// 定义函数，接收红色(r)、绿色(g)、蓝色(b)的值 (范围 0-255)
export function rgbToHsl(r: number, g: number, b: number) {
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)

  let h = 0
  let s = 0
  const l = (max + min) / 2

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
```

---

## 2. 🛡️ `isGoodColor`: 优质颜色过滤器

**目标**: 过滤掉那些“无聊”（太灰）或“看不清/太刺眼”（太黑/太白）的颜色。

```typescript
export function isGoodColor(r: number, g: number, b: number) {
  const hsl = rgbToHsl(r, g, b)
  const s = hsl[1]
  const l = hsl[2]

  if (l < 0.2 || l > 0.8 || s < 0.2 || s > 0.8) {
    return false
  }
  return true
}
```

---

## 3. 🧠 `findBestColors`: "智能优选" 算法 (⚡️ 优化版)

**优化亮点**:

1.  **预处理 HSL**: 在循环开始前，一次性将所有颜色转换为 HSL，避免在嵌套循环中重复计算（O(N) vs O(N^2) 次转换）。
2.  **跳过无效循环**: 直接选取 ColorThief 返回的主色调作为起始点，省去了第一轮无效的“自我比较”。

### 重点详解：`reduce` 到底是什么？

在看代码之前，我们先彻底搞懂 `reduce`。

#### A. JS 原生 `reduce` 的作用

**定义**: `reduce` 的意思是“归纳”或“缩减”。它的作用是**遍历数组，把所有元素“浓缩”成一个值**。

**通用公式**:

```javascript
数组.reduce((累计结果, 当前元素) => {
  // 做一些计算...
  return 新的累计结果
}, 初始值)
```

**最常见的例子 (求和)**:

- 目标：把 `[1, 2, 3]` 浓缩成一个总数。
- 累计结果 (`sum`): 目前算出来的和。
- 当前元素 (`num`): 正在看的数字。
- 初始值: `0`。

```javascript
;[1, 2, 3].reduce((sum, num) => sum + num, 0)
// 结果是 6
```

#### B. 本项目中的 `reduce` 的作用

**定义**: 在这里，我们要把**“已选颜色列表”**浓缩成一个数字 —— **“最小距离”**。

**对应关系**:

- **数组**: `bestColors` (已选颜色列表，假设里面坐了3个人)。
- **当前元素 (`selected`)**: 列表里坐着的某一个人。
- **累计结果 (`min`)**: **目前为止**发现的最近距离。
- **初始值**: `Infinity` (无穷大)。因为我们要找最小值，初始设得巨大无比，才能保证第一次比较时一定能变小。

**一句话总结**: `reduce` 帮我们问了一圈已选的人：“你们离我（ उम्मीदवार）有多远？”，然后记住了**最近**的那个距离。

### 逐行注释代码 (超详细版)

```typescript
// 定义函数：从一堆颜色中选出 num 个“最好”的颜色
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
  // 预先计算所有候选颜色的 HSL，并和 RGB 一起存起来。
  const candidates = goodColors.map((rgb) => ({
    rgb,
    hsl: rgbToHsl(...rgb)
  }))

  // 4. 初始化：
  // 直接“内定”第一个候选项 (权重最高的主色调)
  const first = candidates.shift()
  if (!first) return []

  // 初始化胜者组
  const bestColors = [first]

  // 5. 贪心选择 (Maximin 策略)：
  // 循环去找剩下的 num - 1 个颜色
  for (let i = 1; i < num; i++) {
    let bestCandidate: typeof first | undefined
    let maxMinDist = 0 // 记录本轮所有候选人中最大的那个“差异度”

    // 遍历每一个候选人 (candidate)
    for (const candidate of candidates) {
      // === reduce 深度拆解 ===
      // 目标: 算出 candidate 离 bestColors 里最近的那个人有多近？
      // array.reduce((accumulator, currentValue) => ..., initialValue)
      const minDist = bestColors.reduce(
        // 回调函数开始
        (min, selected) => {
          // min (accumulator): 到目前为止找到的“最近距离”。
          // selected (currentValue): bestColors 数组里正在被比较的那个已选颜色。

          // 1. 算距离 (只看饱和度 S 和 亮度 L)
          const dist =
            Math.abs(selected.hsl[1] - candidate.hsl[1]) + // 饱和度差的绝对值
            Math.abs(selected.hsl[2] - candidate.hsl[2]) // 亮度差的绝对值
          // 提示: 这里特意没算色相(H)，是为了保证同色系

          // 2. 更新“最近距离”
          // Math.min(老记录, 新距离)
          // 比如：之前发现有人离我 5米 (min=5)。
          // 现在这个人离我 2米 (dist=2)。
          // 那离我最近的人就变成了 2米 (返回 2，作为下一次的 min)。
          return Math.min(min, dist)
        },
        // 初始值: 无穷大 (Infinity)
        // 为什么？因为如果设为 0，Math.min(0, 任何数) 永远是 0，逻辑就错了。
        Infinity
      )

      // === 贪心决策 ===
      // minDist 就是这个 candidate 的“生存空间”或“独特性”。
      // 这里的逻辑是：谁的生存空间最大（离大家最远），谁就最适合入选。
      if (minDist > maxMinDist) {
        maxMinDist = minDist
        bestCandidate = candidate
      }
    }

    // 选出这一轮的胜者
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
```
