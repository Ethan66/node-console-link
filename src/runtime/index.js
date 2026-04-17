;(function () {
  var root =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
      ? global
      : {}

  if (root.__CONSOLE_LINK__) return

  var COLORS = [
    '#FF416C',
    '#2196F3',
    '#00b09b',
    '#FFA500',
    '#9733EE',
    '#FDB813',
    '#E91E63',
    '#00BCD4',
    '#8BC34A',
    '#FF5722',
    '#673AB7',
    '#009688'
  ]
  var colorIndex = 0
  var callStack = []

  // 判断是否是 DOM/Event/Vue 实例等不可序列化的对象
  function isUnsafeObject(val) {
    if (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) return true
    if (typeof Event !== 'undefined' && val instanceof Event) return true
    if (val && val._isVue) return true
    if (val && val.__v_isVue) return true
    return false
  }

  function safeClone(val) {
    if (isUnsafeObject(val)) return '[' + (val.constructor ? val.constructor.name : 'Object') + ']'
    try {
      return JSON.parse(JSON.stringify(val))
    } catch (e) {
      return '[Object]'
    }
  }

  // 将 paramStr + args 构建为 { paramName: argValue } 对象
  // paramStr 示例: "e, { id, name }, options" 或 "...items" 或 ""
  function buildParams(paramStr, args) {
    if (!paramStr) return {}
    var names = paramStr.split(', ')
    var params = {}
    var argIdx = 0
    for (var i = 0; i < names.length; i++) {
      var name = names[i].trim()
      if (!name) continue
      if (name.startsWith('...')) {
        // 剩余参数: "...items" → { items: value }
        params[name.slice(3)] = safeClone(args[argIdx++])
      } else if (name.startsWith('{') || name.startsWith('[')) {
        // 解构参数: "{ id, name }" → { id: val1, name: val2 }
        var inner = name.slice(1, -1).trim()
        var bindings = inner
          .split(',')
          .map(function (s) {
            return s.trim()
          })
          .filter(Boolean)
        for (var j = 0; j < bindings.length; j++) {
          params[bindings[j]] = safeClone(args[argIdx++])
        }
      } else {
        // 简单标识符
        params[name] = safeClone(args[argIdx++])
      }
    }
    return params
  }

  // 递归移除内部 __color 标记，避免出现在打印输出中
  function stripMeta(node) {
    if (!node) return
    delete node.__color
    var keys = Object.keys(node.zfn || {})
    for (var i = 0; i < keys.length; i++) {
      stripMeta(node.zfn[keys[i]])
    }
  }

  root.__CONSOLE_LINK__ = function (fnName, paramStr, args, location) {
    var isTopLevel = callStack.length === 0

    // 颜色分配：顶层新颜色，子函数复用父级颜色
    var color = isTopLevel ? COLORS[colorIndex++ % COLORS.length] : callStack[callStack.length - 1].__color

    // 构建 params 对象
    var params = buildParams(paramStr, args)

    // 构建节点
    var node = {
      params: params,
      path: location || '',
      zfn: {}
    }
    node.__color = color

    // 挂载到父节点的 zfn
    if (!isTopLevel) {
      callStack[callStack.length - 1].zfn[fnName] = node
    }

    callStack.push(node)

    // 返回清理函数，在 finally 中调用
    return function () {
      callStack.pop()
      if (isTopLevel) {
        stripMeta(node)
        var wrapper = {}
        wrapper[fnName] = node
        var sendToExtension = root.sendConsoleToExtension
        if (typeof sendToExtension === 'function') {
          try {
            console.warn('----- my data is wrapper: ', wrapper)
            sendToExtension(wrapper)
          } catch (e) {}
        }
      }
    }
  }
})()
