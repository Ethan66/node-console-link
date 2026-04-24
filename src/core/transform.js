const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default || require('@babel/traverse')
const generate = require('@babel/generator').default || require('@babel/generator')
const t = require('@babel/types')

const RUNTIME_CODE = require('fs').readFileSync(require('path').resolve(__dirname, '../runtime/index.js'), 'utf-8')

// 需要过滤的关键字/语句（非函数）+ Vue 的 data 钩子 + render 函数
const SKIP_NAMES = new Set(['for', 'while', 'do', 'switch', 'catch', 'data', 'render', 'click', 'setup', '_sfc_render'])

// Vue 上下文检测：watch/computed/methods 对象的 key
const VUE_CONTEXT_KEYS = new Set(['watch', 'computed'])

// Vue 生命周期钩子名称
const LIFECYCLE_HOOKS = new Set([
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroy',
  'destroyed',
  'activated',
  'deactivated',
  'beforeUnmount',
  'unmounted',
  'errorCaptured',
  'renderTracked',
  'renderTriggered',
  'serverPrefetch'
])

// 原生数组遍历方法，作为回调时跳过
const ARRAY_METHODS = new Set([
  'forEach',
  'map',
  'reduce',
  'reduceRight',
  'filter',
  'find',
  'findIndex',
  'every',
  'some',
  'sort',
  'flatMap',
  'keys',
  'values',
  'entries'
])

/**
 * 获取函数名
 */
function getFunctionName(path) {
  const node = path.node

  // function foo() {}
  if (t.isFunctionDeclaration(node) && node.id) {
    return node.id.name
  }

  // { foo() {} } / { get foo() {} } / { set foo() {} }
  if (t.isObjectMethod(node) || t.isClassMethod(node)) {
    if (t.isIdentifier(node.key)) return node.key.name
    if (t.isStringLiteral(node.key)) return node.key.value
    return ''
  }

  const parent = path.parent

  // const foo = () => {} / const foo = function() {}
  if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
    return parent.id.name
  }

  // obj.method = function() {} / obj.method = () => {}
  if (t.isAssignmentExpression(parent)) {
    if (t.isMemberExpression(parent.left) && t.isIdentifier(parent.left.property)) {
      return parent.left.property.name
    }
    if (t.isIdentifier(parent.left)) {
      return parent.left.name
    }
  }

  // { foo: function() {} } / { foo: () => {} }
  if (t.isObjectProperty(parent)) {
    if (t.isIdentifier(parent.key)) return parent.key.name
    if (t.isStringLiteral(parent.key)) return parent.key.value
  }

  return ''
}

/**
 * 检测函数所在的 Vue 上下文，返回前缀字符串
 * 如 '[watch] '、'[computed] '、'[methods] '、'[lifecycle] '，或空字符串
 */
function getVueContext(path, fnName) {
  // 向上查找祖先，检测是否在 watch/computed/methods 对象内
  var current = path.parentPath
  while (current) {
    if (t.isObjectProperty(current.node)) {
      var key = current.node.key
      if (t.isIdentifier(key) && VUE_CONTEXT_KEYS.has(key.name)) {
        return '[' + key.name + '] '
      }
    }
    // 遇到导出声明或顶层就停止，避免向上穿透到无关作用域
    if (t.isExportDefaultDeclaration(current.node) || t.isProgram(current.node)) {
      break
    }
    current = current.parentPath
  }

  // 检查是否是生命周期钩子
  if (LIFECYCLE_HOOKS.has(fnName)) {
    return '[lifecycle] '
  }

  return ''
}

/**
 * 判断是否是数组方法的回调（如 arr.forEach(() => {})）
 */
function isArrayMethodCallback(path) {
  const parent = path.parent
  if (!t.isCallExpression(parent)) return false
  const callee = parent.callee
  if (!t.isMemberExpression(callee)) return false
  if (t.isIdentifier(callee.property) && ARRAY_METHODS.has(callee.property.name)) {
    // 确认当前函数是第一个参数（回调）
    return parent.arguments[0] === path.node
  }
  return false
}

/**
 * 提取参数名列表
 */
function getParamIdentifiers(params) {
  const ids = []
  for (const param of params) {
    if (t.isIdentifier(param)) {
      ids.push(t.identifier(param.name))
    } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
      ids.push(t.identifier(param.left.name))
    } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
      ids.push(t.identifier(param.argument.name))
    } else if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
      // 解构参数，收集绑定的标识符
      const bindings = []
      collectBindingIdentifiers(param, bindings)
      ids.push(...bindings)
    }
  }
  return ids
}

function collectBindingIdentifiers(node, result) {
  if (t.isIdentifier(node)) {
    result.push(t.identifier(node.name))
  } else if (t.isObjectPattern(node)) {
    for (const prop of node.properties) {
      if (t.isRestElement(prop)) {
        collectBindingIdentifiers(prop.argument, result)
      } else {
        collectBindingIdentifiers(prop.value, result)
      }
    }
  } else if (t.isArrayPattern(node)) {
    for (const elem of node.elements) {
      if (elem) collectBindingIdentifiers(elem, result)
    }
  } else if (t.isAssignmentPattern(node)) {
    collectBindingIdentifiers(node.left, result)
  } else if (t.isRestElement(node)) {
    collectBindingIdentifiers(node.argument, result)
  }
}

function buildSourceLineMap(code, options = {}) {
  const { filename = 'unknown.js', lineOffset = 0 } = options
  const isTS = /\.tsx?$/.test(filename)
  const isJSX = /\.[jt]sx$/.test(filename)
  const plugins = ['decorators-legacy', 'classProperties', 'classPrivateProperties', 'classPrivateMethods']
  if (isTS) plugins.push('typescript')
  if (isJSX || isTS) plugins.push('jsx')
  if (!isTS) plugins.push('jsx')

  let ast
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      plugins
    })
  } catch (e) {
    return {}
  }

  const lineMap = Object.create(null)

  traverse(ast, {
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod|ClassMethod': function (path) {
      if (!t.isBlockStatement(path.node.body)) return

      const fnName = getFunctionName(path)
      if (!fnName) return
      if (SKIP_NAMES.has(fnName)) return
      if (isArrayMethodCallback(path)) return

      const vueContext = getVueContext(path, fnName)
      const displayName = vueContext ? vueContext + fnName : fnName

      if (!Object.prototype.hasOwnProperty.call(lineMap, displayName) && path.node.loc) {
        lineMap[displayName] = path.node.loc.start.line + lineOffset
      }
    }
  })

  return lineMap
}

/**
 * 获取形参名字符串列表（用于运行时显示）
 */
function getParamNames(params) {
  const names = []
  for (const param of params) {
    if (t.isIdentifier(param)) {
      names.push(param.name)
    } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
      names.push(param.left.name)
    } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
      names.push('...' + param.argument.name)
    } else if (t.isObjectPattern(param)) {
      const bindings = []
      collectBindingIdentifiers(param, bindings)
      names.push('{ ' + bindings.map(b => b.name).join(', ') + ' }')
    } else if (t.isArrayPattern(param)) {
      const bindings = []
      collectBindingIdentifiers(param, bindings)
      names.push('[ ' + bindings.map(b => b.name).join(', ') + ' ]')
    }
  }
  return names
}

/**
 * 构建注入的 AST 节点（含 try/finally）：
 *
 * var __cl = window.__CONSOLE_LINK__ && window.__CONSOLE_LINK__("fnName", "a, b", [a, b]);
 * try { ...originalBody } finally { __cl && __cl(); }
 */
function buildInjection(fnName, paramNames, paramIds, originalStatements, location, isAsync) {
  const consoleLinkAccess = t.memberExpression(t.identifier('window'), t.identifier('__CONSOLE_LINK__'))

  const callExpr = t.callExpression(t.memberExpression(t.identifier('window'), t.identifier('__CONSOLE_LINK__')), [
    t.stringLiteral(fnName),
    t.stringLiteral(paramNames.join(', ')),
    t.arrayExpression(paramIds),
    t.stringLiteral(location)
  ])

  // var __cl = window.__CONSOLE_LINK__ && window.__CONSOLE_LINK__(...)
  const varDecl = t.variableDeclaration('var', [
    t.variableDeclarator(t.identifier('__cl'), t.logicalExpression('&&', consoleLinkAccess, callExpr))
  ])

  let tryFinally

  if (isAsync) {
    const resultDecl = t.variableDeclaration('var', [t.variableDeclarator(t.identifier('__cl_result'), null)])
    const wrappedBody = t.callExpression(
      t.memberExpression(
        t.arrowFunctionExpression([], t.blockStatement(originalStatements), true),
        t.identifier('call')
      ),
      [t.thisExpression()]
    )

    tryFinally = t.tryStatement(
      t.blockStatement([
        resultDecl,
        t.expressionStatement(
          t.assignmentExpression('=', t.identifier('__cl_result'), wrappedBody)
        ),
        t.returnStatement(t.awaitExpression(t.identifier('__cl_result')))
      ]),
      null,
      t.blockStatement([
        t.expressionStatement(
          t.logicalExpression(
            '&&',
            t.identifier('__cl'),
            t.callExpression(t.identifier('__cl'), [t.identifier('__cl_result')])
          )
        )
      ])
    )
  } else {
    // try { ...originalBody } finally { __cl && __cl() }
    tryFinally = t.tryStatement(
      t.blockStatement(originalStatements),
      null,
      t.blockStatement([
        t.expressionStatement(t.logicalExpression('&&', t.identifier('__cl'), t.callExpression(t.identifier('__cl'), [])))
      ])
    )
  }

  return { varDecl, tryFinally }
}

/**
 * 核心转换函数
 * @param {string} code - 源代码
 * @param {object} options - 选项
 * @param {string} options.filename - 文件名（用于 parser 插件推断）
 * @param {boolean} options.injectRuntime - 是否注入运行时代码（默认 true）
 * @returns {{ code: string, map?: object }}
 */
function transform(code, options = {}) {
  const { filename = 'unknown.js', injectRuntime = true, lineOffset = 0, sourceLineMap = null } = options

  const isTS = /\.tsx?$/.test(filename)
  const isJSX = /\.[jt]sx$/.test(filename)

  const plugins = ['decorators-legacy', 'classProperties', 'classPrivateProperties', 'classPrivateMethods']
  if (isTS) plugins.push('typescript')
  if (isJSX || isTS) plugins.push('jsx')
  if (!isTS) plugins.push('jsx')

  let ast
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      plugins
    })
  } catch (e) {
    // 解析失败则返回原始代码
    console.warn(`[console-link] 解析失败: ${filename}`, e.message)
    return { code }
  }

  let hasInjection = false

  traverse(ast, {
    'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod|ClassMethod': function (path) {
      // 跳过没有块语句体的箭头函数 (如 () => expr)
      if (!t.isBlockStatement(path.node.body)) return

      // 获取函数名
      const fnName = getFunctionName(path)

      // 无名函数跳过
      if (!fnName) return

      // 检测 Vue 上下文，拼接前缀
      const vueContext = getVueContext(path, fnName)
      const displayName = vueContext ? vueContext + fnName : fnName

      // 无名函数跳过
      if (!fnName) return

      // 过滤关键字
      if (SKIP_NAMES.has(fnName)) return

      // 过滤数组方法回调
      if (isArrayMethodCallback(path)) return

      // 获取参数标识符和形参名
      const paramIds = getParamIdentifiers(path.node.params)
      const paramNames = getParamNames(path.node.params)

      // 获取从 src 开始的文件路径和行号
      const normalizedName = filename.replace(/\\/g, '/')
      const srcIndex = normalizedName.lastIndexOf('/src/')
      const shortName =
        srcIndex !== -1 ? normalizedName.slice(srcIndex + 1) : normalizedName.split('/').pop() || filename
      const line = sourceLineMap && Object.prototype.hasOwnProperty.call(sourceLineMap, displayName)
        ? sourceLineMap[displayName]
        : (path.node.loc ? path.node.loc.start.line : 0) + lineOffset
      const location = shortName + ':' + line

      // 保存原始函数体，构建 try/finally 包裹
      const originalStatements = [...path.node.body.body]
      const { varDecl, tryFinally } = buildInjection(
        displayName,
        paramNames,
        paramIds,
        originalStatements,
        location,
        path.node.async
      )

      // 替换函数体为：var __cl = ...; try { 原始体 } finally { __cl && __cl() }
      path.node.body.body = [varDecl, tryFinally]
      hasInjection = true
    }
  })

  if (!hasInjection) return { code }

  // 在文件顶部注入运行时引导代码
  if (injectRuntime) {
    const runtimeAST = parser.parse(RUNTIME_CODE, { sourceType: 'script' })
    ast.program.body.unshift(...runtimeAST.program.body)
  }

  const output = generate(
    ast,
    {
      retainLines: true,
      compact: false
    },
    code
  )

  return {
    code: output.code,
    map: output.map
  }
}

module.exports = {
  buildSourceLineMap,
  transform,
  RUNTIME_CODE
}
