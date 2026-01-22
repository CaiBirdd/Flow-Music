# 双语歌词功能实现

## 概述

为歌词播放器添加双语歌词支持，使英文歌曲能够同时显示中文翻译。

## 修改日期

2025年12月31日

## 修改文件清单

| 文件路径                                  | 修改类型            |
| ----------------------------------------- | ------------------- |
| `src/renderer/src/api/musicList.ts`       | 接口扩展            |
| `src/renderer/src/utils/lyric/parser.ts`  | 类型扩展 + 新增函数 |
| `src/renderer/src/utils/lyric/index.ts`   | 导出更新            |
| `src/renderer/src/store/music.ts`         | 逻辑修改            |
| `src/renderer/src/utils/lyric/player.ts`  | 渲染修改            |
| `src/renderer/src/utils/lyric/style.scss` | 样式添加            |

## 详细修改内容

### 1. API 接口扩展 (`musicList.ts`)

在 `GetLyricRes` 接口中添加 `tlyric` 翻译歌词字段：

```typescript
interface GetLyricRes {
  code: number
  klyric: { lyric: string; version: number }
  lrc: { lyric: string; version: number }
  tlyric: {
    // 新增
    lyric: string
    version: number
  } | null
  yrc: { lyric: string } | null
  version: 39
}
```

### 2. 歌词类型扩展 (`parser.ts`)

#### 2.1 扩展 `LyricLine` 接口

```typescript
export interface LyricLine {
  time: number
  duration: number
  text: string
  translation?: string // 新增：翻译文本
  index: number
}
```

#### 2.2 新增歌词合并函数

```typescript
/**
 * 合并原歌词和翻译歌词
 * 根据时间戳匹配，将翻译文本附加到原歌词行
 * @param original 原歌词解析结果
 * @param translationLrc 翻译歌词字符串
 * @returns 合并后的歌词行数组
 */
export function mergeLyricsWithTranslation(
  original: ParseResult,
  translationLrc: string | undefined | null
): LyricLine[]
```

**匹配逻辑：**

- 优先精确匹配时间戳
- 支持 ±0.5 秒容差匹配
- 无翻译时优雅降级

### 3. 导出更新 (`index.ts`)

```typescript
export { parseLRC, mergeLyricsWithTranslation } from './parser'
```

### 4. Store 逻辑修改 (`music.ts`)

```typescript
import { parseLRC, mergeLyricsWithTranslation } from '@/utils/lyric'

const getLyricHandler = async (id: number) => {
  const { lrc, tlyric } = await getLyric(id) // 提取翻译歌词
  const result = parseLRC(lrc.lyric)
  // 合并翻译歌词
  state.lyric = mergeLyricsWithTranslation(result, tlyric?.lyric)
  state.noTimestamp = result.noTimestamp
  if (state.lyric.length === 1) {
    state.lyric = []
  }
}
```

### 5. 播放器渲染修改 (`player.ts`)

将原来的单行文本渲染改为双层结构：

```typescript
for (const line of this.lyrics) {
  const div = document.createElement('div')
  div.className = 'lyric-line'
  div.dataset.index = String(line.index)

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

  // ...
}
```

### 6. 样式添加 (`style.scss`)

```scss
.lyric-line {
  padding: 14px 24px;
  font-size: 26px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  line-height: 1.6;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
  cursor: pointer;
  text-align: left;
  border-radius: 8px;
  margin: 2px 0;

  .lyric-text {
    display: -webkit-box;
    -webkit-line-clamp: none;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .lyric-translation {
    font-size: 18px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.25);
    line-height: 1.5;
    transition: all 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
    letter-spacing: 0.8px;
  }

  &:hover {
    color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.05);

    .lyric-translation {
      color: rgba(255, 255, 255, 0.4);
    }
  }

  &.active {
    font-size: 26px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.95);
    min-height: 60px;
    text-shadow: 0 0 12px rgba(255, 255, 255, 0.15);

    .lyric-text {
      -webkit-line-clamp: none;
    }

    .lyric-translation {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.95);
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.25);
      letter-spacing: 0.8px;
    }
  }

  // 无时间戳歌词禁用点击效果
  &.no-timestamp {
    cursor: default;

    &:hover {
      background: transparent;
    }
  }
}
```

## 功能特点

1. **智能时间戳匹配** - 精确匹配 + ±0.5秒容差匹配
2. **优雅降级** - 无翻译歌词时只显示原歌词，不影响正常使用
3. **视觉层次分明** - 翻译使用较小字号和淡色，不干扰原歌词阅读
4. **高亮同步** - 当前播放行高亮时，翻译文本也同步变亮
5. **零侵入** - 不影响原有歌词功能，完全向后兼容

## 效果预览

```
┌─────────────────────────────────────┐
│  I've been waiting for you         │  ← 原歌词（高亮）
│  我一直在等你                        │  ← 翻译（较小字号）
├─────────────────────────────────────┤
│  All my life                        │  ← 原歌词（暗色）
│  我的一生                            │  ← 翻译（更淡）
└─────────────────────────────────────┘
```

## 依赖说明

本功能依赖网易云音乐 API 返回的 `tlyric` 字段。该字段由网易云官方提供，大部分热门英文歌曲都有中文翻译。
