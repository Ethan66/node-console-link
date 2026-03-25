# node-console-link 项目梳理

## 项目概述

一个 Node.js CLI 工具（命令：`pr-link`），用于**自动给 JS/TS/Vue 文件中的每个函数体开头注入 `console.log`**，打印函数名和参数，方便调试。

---

## 文件结构

```
src/
├── index.js        # 入口文件：遍历目录/文件，对每个文件进行处理
├── config.js       # 配置常量：颜色、需要过滤的原生方法、console 前缀样式
└── utils/
    └── index.js    # 核心逻辑：解析函数、生成 console.log、替换代码
```

---

## 各文件函数详解

### `src/index.js` — 入口文件

| 函数 | 签名 | 说明 |
|------|------|------|
| `traverseDir` | `(dir, callback) => void` | 递归遍历目录，对每个 `.js/.ts/.jsx/.tsx/.vue` 文件执行回调。如果传入的是文件则直接执行回调 |
| `processFile` | `(filePath) => void` | 读取文件内容，调用 `getNewCode` 生成注入 console 后的新代码，写回文件。对 `.vue` 文件只处理 `<script>` 标签内的内容 |

### `src/config.js` — 配置常量

| 导出项 | 类型 | 说明 |
|--------|------|------|
| `gradientColorMap` | `Map` | 渐变色映射表（yellow/orange/red/green/blue/purple），用于 console 输出的背景色 |
| `NATIVE_MAP_METHODS` | `string[]` | 原生数组遍历方法名列表（forEach/map/reduce 等），这些方法内不注入 console |
| `NEW_NATIVE_MAP_METHODS` | `string[]` | 在方法名后加 `(` 的列表，用于匹配回调形式如 `forEach(` |
| `prefixFn` | `string[]` | 函数名部分的 console 样式前缀（随机渐变色背景） |
| `prefixArg` | `string[]` | 参数部分的 console 样式前缀（深色背景） |

### `src/utils/index.js` — 核心逻辑

| 函数 | 签名 | 说明 |
|------|------|------|
| `getDirectory` | `() => string` | 从命令行参数（`process.argv[2]`）获取目标目录/文件路径，校验存在性，不存在则报错并返回空串 |
| `getRealFun` | `(fnContext) => string` | 获取函数体首行非空内容。如果已经被注入过 console（以 `console.log('%c` 开头），返回空串跳过，避免重复注入 |
| `getPureFnName` | `(fnName) => string` | 从正则匹配到的函数名原始串中提取纯净的函数名。支持多种写法：`function fn(){}`、`obj.fn = function(){}`、`const fn = () =>{}`、`.then()` 等。清除 `\r` 字符 |
| `getPureArg` | `(arg, fnName) => string` | 处理参数字符串，去除 TS 类型注解，只保留参数名。对 `if` 语句特殊处理：提取条件中的变量名 |
| `getPureInitArg` | `(arg) => string` | 清除参数字符串中的换行符和尾部空白，转义单引号，用于在 console 字符串中安全展示原始参数 |
| `getCopyArg` | `(arg) => string` | 对参数生成深拷贝表达式：对象类型用 `JSON.parse(JSON.stringify())` 包裹，基本类型直接输出，避免打印引用类型时值被后续修改 |
| `getConsoleContent` | `(fnName, initArg, arg, fnContext) => string` | 生成最终的 `console.log(...)` 语句字符串，包含带样式的函数名、参数声明展示、以及深拷贝后的参数值 |
| `getAddConsoleFunCode` | `(fnCode, consoleContent) => string` | 将原始函数声明代码与生成的 console 语句拼接 |
| `getFunCodeOb` | `(code) => object` | 核心解析函数。用正则匹配代码中的第一个函数定义（普通函数/箭头函数/方法），返回包含 `str`（匹配串）、`fnName`（函数名）、`arg`（参数）、`fnContext`（函数体首行）、`index`（位置）的对象。过滤掉 `for`/`switch` 和原生遍历方法 |
| `getNewCode` | `(code) => string` | 递归处理整段代码。不断调用 `getFunCodeOb` 找到下一个函数，注入 console，然后对剩余代码继续递归，直到没有更多函数可处理 |

---

## 工作流程

```
用户执行: pr-link ./src
       │
       ▼
  getDirectory() 获取目标路径
       │
       ▼
  traverseDir() 递归遍历目录
       │
       ▼ （对每个 .js/.ts/.vue 文件）
  processFile()
       │
       ├─ .vue 文件 → 只提取 <script> 内容处理
       └─ 其他文件 → 整个文件处理
       │
       ▼
  getNewCode() 递归处理代码
       │
       ▼
  getFunCodeOb() 正则匹配函数定义
       │
       ▼
  getConsoleContent() 生成 console.log 语句
       │
       ▼
  写回文件
```

## 注入效果示例

源代码：
```js
const fn = (a, b) => {
  return a + b
}
```

处理后：
```js
const fn = (a, b) => {
  console.log('%cfn%ca, b', 'background: linear-gradient(...); ...', 'background: #35495e; ...', typeof a === 'object' ? JSON.parse(JSON.stringify(a)) : a, typeof b === 'object' ? JSON.parse(JSON.stringify(b)) : b);
  return a + b
}
```
