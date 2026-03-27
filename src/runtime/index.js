;(function() {
  var root = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : {}

  if (root.__CONSOLE_LINK__) return

  var COLORS = [
    '#FF416C', '#2196F3', '#00b09b', '#FFA500',
    '#9733EE', '#FDB813', '#E91E63', '#00BCD4',
    '#8BC34A', '#FF5722', '#673AB7', '#009688'
  ]
  var colorIndex = 0

  root.__CONSOLE_LINK__ = function(fnName, paramStr, args) {
    var color = COLORS[colorIndex % COLORS.length]
    colorIndex++
    var fnStyle = 'background:' + color + ';padding:1px 6px;color:#fff;border-radius:2px;'
    var argStyle = 'background:#35495e;padding:1px 6px;color:#fff;border-radius:2px;'

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

    // string/number 拼进字符串，其他类型作为独立参数传入
    var inlineStr = ''
    var extraArgs = []
    for (var i = 0; i < args.length; i++) {
      var val = args[i]
      if (i > 0) inlineStr += ', '
      if (typeof val === 'function') {
        inlineStr += "'func'"
      } else if (typeof val === 'string') {
        // 超长字符串截断，防止乱码或二进制数据刷屏
        var str = val.length > 200 ? val.slice(0, 200) + '...' : val
        // 检测是否含有不可读字符（二进制/乱码）
        if (/[\x00-\x08\x0E-\x1F\x80-\xFF]/.test(str)) {
          inlineStr += "'[BinaryString]'"
        } else {
          inlineStr += "'" + str + "'"
        }
      } else if (typeof val === 'number') {
        inlineStr += String(val)
      } else {
        if (typeof val === 'object' && val !== null && isUnsafeObject(val)) {
          inlineStr += "'[" + (val.constructor ? val.constructor.name : 'Object') + "]'"
        } else {
          inlineStr += '%o'
          if (typeof val === 'object' && val !== null) {
            extraArgs.push(safeClone(val))
          } else {
            extraArgs.push(val)
          }
        }
      }
    }

    var argDisplay = args.length > 0 ? ' ' + inlineStr : ''

    // %c函数名%c(形参)%c 实参值
    // 第三个 %c 切回无样式，让实参部分没有背景色
    var label = paramStr
      ? '%c' + fnName + '%c(' + paramStr + ')%c' + argDisplay
      : '%c' + fnName + '%c()%c' + argDisplay

    console.log.apply(console, [label, fnStyle, argStyle, ''].concat(extraArgs))
  }
})()
