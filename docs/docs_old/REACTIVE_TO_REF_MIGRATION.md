# Reactive 到 Ref 迁移指南

> 本文档记录了项目中将 `reactive` 全部迁移为 `ref` 的过程和注意事项。

## 📋 迁移概述

**迁移日期**：2026-01-01  
**迁移范围**：项目中所有使用 `reactive` 的 Vue 组件和 TypeScript 文件  
**迁移原因**：统一响应式 API 使用方式，提高代码一致性

---

## 🔄 修改文件列表

### Vue 组件文件（11个）

| 文件路径                                                | 修改内容                   |
| ------------------------------------------------------- | -------------------------- |
| `src/renderer/src/views/UserDetail/index.vue`           | `state` reactive → ref     |
| `src/renderer/src/views/UserCover/index.vue`            | `state` reactive → ref     |
| `src/renderer/src/views/SingerPage/index.vue`           | `state` reactive → ref     |
| `src/renderer/src/views/Setting/index.vue`              | `form` reactive → ref      |
| `src/renderer/src/views/SearchList/index.vue`           | `state` reactive → ref     |
| `src/renderer/src/views/MusicCloud/index.vue`           | `state` reactive → ref     |
| `src/renderer/src/views/Home/components/individual.vue` | `state` reactive → ref     |
| `src/renderer/src/views/Comment/index.vue`              | `state` reactive → ref     |
| `src/renderer/src/components/Versions.vue`              | `versions` reactive → ref  |
| `src/renderer/src/components/Search/index.vue`          | `state` reactive → ref     |
| `src/renderer/src/components/MusicPlayer/index.vue`     | `timeState` reactive → ref |

### TypeScript 文件（4个）

| 文件路径                                           | 修改内容                              |
| -------------------------------------------------- | ------------------------------------- |
| `src/renderer/src/store/music.ts`                  | Pinia store 中 `state` reactive → ref |
| `src/renderer/src/store/settings.ts`               | Pinia store 中 `state` reactive → ref |
| `src/renderer/src/layout/BaseAside/usePlayList.ts` | `playListState` reactive → ref        |
| `src/renderer/src/components/Search/useSearch.ts`  | `state` reactive → ref                |

---

## ⚠️ 关键注意事项

### 1. `.value` 的使用规则

#### ✅ 需要添加 `.value` 的场景

**在 script 中访问本地定义的 ref：**

```typescript
// 修改前 (reactive)
const state = reactive({ loading: false, list: [] })
state.loading = true // 直接访问

// 修改后 (ref)
const state = ref({ loading: false, list: [] })
state.value.loading = true // 需要 .value
```

**在 Pinia store 内部函数中访问 ref state：**

```typescript
// store/music.ts 内部
const state = ref<State>({ musicUrl: '', songs: {} })

const updateState = (data) => {
  Object.assign(state.value, data) // 内部需要 .value
}
```

#### ❌ 不需要 `.value` 的场景

**Vue 模板中：**

```vue
<!-- Vue 自动解包 ref -->
<div>{{ state.loading }}</div>
<SongList :list="state.list" />
```

**Pinia store 外部使用（组件中）：**

```typescript
// 组件中使用 store
const music = useMusicAction()
console.log(music.state.musicUrl) // Pinia 自动解包，不需要 .value
```

### 2. 类型定义的变化

```typescript
// 修改前
const state: State = reactive({...})

// 修改后
const state = ref<State>({...})
```

### 3. watch 中的变化

```typescript
// 修改前
watch(() => state.index, (val) => {...})

// 修改后 - store 内部
watch(() => state.value.index, (val) => {...})

// 修改后 - 组件中使用 store（不变）
watch(() => music.state.index, (val) => {...})
```

---

## 📝 代码示例对比

### 示例 1：普通组件中的 state

```typescript
// ============ 修改前 ============
import { reactive, ref } from 'vue'

interface State {
  loading: boolean
  list: Item[]
}

const state: State = reactive({
  loading: false,
  list: []
})

// 使用
state.loading = true
state.list = newList

// ============ 修改后 ============
import { ref } from 'vue'

interface State {
  loading: boolean
  list: Item[]
}

const state = ref<State>({
  loading: false,
  list: []
})

// 使用
state.value.loading = true
state.value.list = newList
```

### 示例 2：Pinia Store

```typescript
// ============ 修改前 ============
import { defineStore } from 'pinia'
import { reactive } from 'vue'

export const useSettings = defineStore('settingsId', () => {
  const state: SettingsState = reactive({
    baseUrl: '',
    lyricBg: 'rhythm'
  })

  const setState = (values?: Partial<typeof state>) => {
    Object.assign(state, values)
  }

  return { state, setState }
})

// ============ 修改后 ============
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettings = defineStore('settingsId', () => {
  const state = ref<SettingsState>({
    baseUrl: '',
    lyricBg: 'rhythm'
  })

  const setState = (values?: Partial<SettingsState>) => {
    Object.assign(state.value, values) // 内部需要 .value
  }

  return { state, setState }
})

// 组件中使用（不变）
const settings = useSettings()
console.log(settings.state.baseUrl) // Pinia 自动解包
```

### 示例 3：导出的全局状态

```typescript
// ============ 修改前 ============
export const playListState: State = reactive({
  playList: [],
  loading: false
})

// 使用
playListState.loading = true

// ============ 修改后 ============
export const playListState = ref<State>({
  playList: [],
  loading: false
})

// 在定义文件中使用
playListState.value.loading = true

// 在模板中使用（自动解包）
// :loading="playListState.loading"
```

---

## 🔍 为什么选择 ref 而不是 reactive？

### ref 的优势

1. **一致性**：所有响应式数据都用同一种方式处理
2. **可替换性**：可以直接替换整个值 `state.value = newState`
3. **类型安全**：与 TypeScript 配合更好
4. **解构友好**：配合 `toRefs` 可以解构而不丢失响应性

### reactive 的限制

1. 不能直接替换整个对象
2. 解构会丢失响应性
3. 只能用于对象类型

---

## ✅ 迁移检查清单

- [x] 所有 `reactive` 导入改为 `ref`
- [x] 所有 `reactive({})` 改为 `ref<Type>({})`
- [x] Store 内部函数中添加 `.value`
- [x] 组件 script 中本地 ref 访问添加 `.value`
- [x] 确认模板中不需要添加 `.value`
- [x] 确认 Pinia store 外部使用不需要 `.value`
- [x] 类型定义从 `const state: Type = reactive()` 改为 `const state = ref<Type>()`

---

## 📚 相关文档

- [Vue 3 响应式基础](https://cn.vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Pinia 核心概念](https://pinia.vuejs.org/core-concepts/)
- [项目编码规范](./CODING_PRACTICE_GUIDE.md)
