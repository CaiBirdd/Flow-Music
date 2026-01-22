# ESLint 与 Prettier 配置说明

> 本文档整理了项目中 ESLint 和 Prettier 的配置规则及工作原理，方便日后参考。

## 📦 项目依赖（package.json）

### 核心工具

| 包名       | 版本    | 作用                      |
| ---------- | ------- | ------------------------- |
| `eslint`   | ^9.39.1 | ESLint 核心（独立安装）   |
| `prettier` | ^3.7.4  | Prettier 核心（独立安装） |

### 配置与插件

| 包名                                       | 版本    | 作用                                                                          |
| ------------------------------------------ | ------- | ----------------------------------------------------------------------------- |
| `@electron-toolkit/eslint-config-prettier` | 3.0.0   | **桥接包** - 让 ESLint 和 Prettier 协作，关闭 ESLint 中与 Prettier 冲突的规则 |
| `@electron-toolkit/eslint-config-ts`       | ^3.1.0  | ESLint 的 TypeScript 规则配置                                                 |
| `eslint-plugin-vue`                        | ^10.6.2 | ESLint 的 Vue 规则插件                                                        |
| `vue-eslint-parser`                        | ^10.2.0 | Vue 文件的 ESLint 解析器                                                      |

---

## 🔌 VS Code 插件

| 插件 ID                  | 名称                      | 作用                 |
| ------------------------ | ------------------------- | -------------------- |
| `esbenp.prettier-vscode` | Prettier - Code formatter | 负责代码格式化       |
| `dbaeumer.vscode-eslint` | ESLint                    | 显示 ESLint 错误警告 |

> ⚠️ **注意**：不要使用 `rvest.vs-code-prettier-eslint` 插件，可能会导致格式化失效。

---

## 📁 配置文件

### 1. Prettier 配置 (`.prettierrc.yaml`)

```yaml
singleQuote: true # 使用单引号
semi: false # 不使用分号
printWidth: 100 # 每行最大字符数
trailingComma: none # 不使用尾随逗号
```

### 2. ESLint 配置 (`eslint.config.mjs`)

```javascript
import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default defineConfig(
  // 忽略目录及 linter 选项配置
  {
    ignores: ['**/node_modules', '**/dist', '**/out'],
    // 修复 ESLint 9.x 扁平配置格式错误
    // reportUnusedDisableDirectives 在扁平配置中必须放在 linterOptions 对象中
    // 旧写法（eslintrc 格式）：reportUnusedDisableDirectives: 'off'
    // 新写法（flat config 格式）：linterOptions.reportUnusedDisableDirectives
    linterOptions: {
      reportUnusedDisableDirectives: 'off'
    }
  },

  // TypeScript 推荐规则
  tseslint.configs.recommended,

  // Vue 推荐规则
  eslintPluginVue.configs['flat/recommended'],

  // Vue 文件解析器配置
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        extraFileExtensions: ['.vue'],
        parser: tseslint.parser
      }
    }
  },

  // 自定义规则
  {
    files: ['**/*.{ts,mts,tsx,vue}', '**/*.d.ts'],
    rules: {
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/require-v-for-key': 'warn', //  v-for 必须有 key 的检查 warn
      '@typescript-eslint/no-explicit-any': 'off', // 关闭禁止使用 any 的规则
      '@typescript-eslint/explicit-function-return-type': 'off', // 关闭函数必须写返回类型的规则
      '@typescript-eslint/no-unused-vars': 'warn', // 关闭未使用的变量检查
      'no-unused-vars': 'off', // 关闭未使用的变量检查
      'no-undef': 'off', // 关闭未定义变量检查（TypeScript 会处理这个）
      '@typescript-eslint/ban-ts-comment': 'off', // 允许使用 @ts-ignore 等注释
      '@typescript-eslint/no-non-null-assertion': 'off', // 允许使用非空断言
      'vue/block-lang': ['error', { script: { lang: 'ts' } }]
    }
  },

  // Prettier 兼容配置（必须放在最后）
  eslintConfigPrettier
)
```

### 3. VS Code 工作区配置 (`.vscode/settings.json`)

```jsonc
{
  // 保存时自动格式化
  "editor.formatOnSave": true,

  // 各语言的格式化器配置
  "[vue]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

> ⚠️ **注意**：原配置中 TypeScript 使用的是 `rvest.vs-code-prettier-eslint` 插件，已更改为 `esbenp.prettier-vscode`，避免格式化失效问题。

---

## 🔄 工作流程

```
保存文件
    ↓
VS Code Prettier 插件
    ↓
读取 .prettierrc.yaml 配置
    ↓
格式化代码（单引号、无分号、行宽等）
    ↓
ESLint 检查代码规范
（通过 eslint-config-prettier 避免与 Prettier 规则冲突）
```

---

## 🛠️ 常用命令

```bash
# 格式化所有文件（根据 package.json）
pnpm format
# 或
npm run format

# 检查 ESLint 错误（根据 package.json）
pnpm lint
# 或
npm run lint

# 类型检查
pnpm typecheck
# 或
npm run typecheck
```

---

## ❓ 常见问题

### Q1: 保存时不自动格式化？

1. 检查 VS Code 设置中 `editor.formatOnSave` 是否为 `true`
2. 确认 Prettier 扩展已安装并启用
3. 检查当前文件类型的 `defaultFormatter` 是否设置为 `esbenp.prettier-vscode`

### Q2: 格式化时引号/分号规则不生效？

1. 确认 `.prettierrc.yaml` 文件存在且配置正确
2. 按 `Ctrl + Shift + P` → `Format Document With...` → 选择 `Prettier`
3. 如果列表中没有 Prettier，说明扩展未安装或被禁用

### Q3: ESLint 和 Prettier 规则冲突？

确保 `eslint.config.mjs` 中 `eslintConfigPrettier` 放在最后，它会关闭所有与 Prettier 冲突的 ESLint 规则。

### Q4: Vue 3.4+ CSS v-bind 警告？

Vue 3.4+ 对 CSS `v-bind()` 增加了严格类型检查，只接受字符串或有限数字。如果传入数组/对象，需要先转换为字符串。

```typescript
// ❌ 错误：传入数组
v - bind('bgColor[0]') // bgColor[0] = [89, 134, 167]

// ✅ 正确：转换为字符串
v - bind('bgColor[0]') // bgColor[0] = "89, 134, 167"
```

### Q5: ESLint 报错 "This appears to be in eslintrc format"？

**问题描述：** ESLint 9.x 使用扁平配置格式（flat config），某些配置项的位置要求与旧版不同。

**错误信息：**

```
ConfigError: Config (unnamed): Key "reportUnusedDisableDirectives":
This appears to be in eslintrc format rather than flat config format.
```

**解决方案：** 将 `reportUnusedDisableDirectives` 配置项移到 `linterOptions` 对象中：

```javascript
// ❌ 错误写法（eslintrc 格式）
export default defineConfig({
  ignores: ['**/node_modules'],
  reportUnusedDisableDirectives: 'off' // 直接放在顶层
})

// ✅ 正确写法（flat config 格式）
export default defineConfig({
  ignores: ['**/node_modules'],
  linterOptions: {
    reportUnusedDisableDirectives: 'off' // 放在 linterOptions 中
  }
})
```

### Q6: 项目中关闭了哪些 ESLint 规则？

项目根据实际开发需求，关闭或调整了以下 ESLint 规则：

- `vue/require-default-prop`: 关闭 - Vue props 不强制要求默认值
- `vue/multi-word-component-names`: 关闭 - 允许单个单词的组件名
- `vue/require-v-for-key`: 警告 - v-for 的 key 提示为警告而非错误
- `@typescript-eslint/no-explicit-any`: 关闭 - 允许使用 any 类型
- `@typescript-eslint/explicit-function-return-type`: 关闭 - 函数不强制写返回类型
- `@typescript-eslint/no-unused-vars`: 警告 - 未使用的变量改为警告
- `no-unused-vars`: 关闭 - 使用 TypeScript 的规则
- `no-undef`: 关闭 - TypeScript 会处理未定义变量
- `@typescript-eslint/ban-ts-comment`: 关闭 - 允许使用 @ts-ignore 等注释
- `@typescript-eslint/no-non-null-assertion`: 关闭 - 允许使用非空断言 (!)
- `vue/block-lang`: 错误 - 强制 Vue 的 script 使用 TypeScript

---

## 📝 版本兼容性说明

| 工具       | 版本    | 注意事项                            |
| ---------- | ------- | ----------------------------------- |
| Vue        | ^3.5.25 | CSS v-bind 增加严格类型检查         |
| ESLint     | ^9.39.1 | 使用扁平化配置 (eslint.config.mjs)  |
| Prettier   | ^3.7.4  | 配置文件支持 .yaml/.json/.js 等格式 |
| TypeScript | ^5.9.3  | 最新稳定版本                        |
| vue-tsc    | ^3.1.6  | Vue 的 TypeScript 类型检查工具      |
| Electron   | ^39.2.6 | Electron 框架                       |

---

_文档更新时间：2025年12月29日_
