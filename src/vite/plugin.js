const { buildSourceLineMap, transform } = require('../core/transform')
const fs = require('fs')
const path = require('path')

const JS_RE = /\.[jt]sx?$/
const VUE_RE = /\.vue$/
// vite 处理 .vue 时会带上 type=script 的 query
const VUE_SCRIPT_RE = /\.vue\?.*type=script/
const VUE_TEMPLATE_RE = /\.vue\?.*type=template/

const DEFAULTS = {
  enabled: true,
  include: null, // 默认处理 src 目录
  exclude: /node_modules/,
  ignore: [], // 白名单文件路径列表，如 ['src/utils/network.js']
  injectRuntime: true,
  injectDevtoolFunction: false // 是否在 HTML 中注入 console-devtool-function.js
}

function isIgnored(filePath, ignoreList, root) {
  if (!ignoreList || ignoreList.length === 0) return false
  var relativePath = path.relative(root, filePath).replace(/\\/g, '/')
  return ignoreList.some(function (pattern) {
    var p = pattern.replace(/\\/g, '/')
    if (relativePath === p || relativePath.endsWith('/' + p)) return true
    if (relativePath.startsWith(p + '/')) return true
    return false
  })
}

function getVueScriptInfo(vueContent) {
  const scriptMatch = vueContent.match(/<script\b([^>]*)>([\s\S]*?)<\/script>/i)
  if (!scriptMatch) {
    return { code: '', lineOffset: 0, filenameSuffix: '.js' }
  }

  const attrs = scriptMatch[1] || ''
  const beforeScript = vueContent.slice(0, scriptMatch.index)
  let filenameSuffix = '.js'

  if (/\blang\s*=\s*["']ts["']/i.test(attrs)) {
    filenameSuffix = '.ts'
  } else if (/\blang\s*=\s*["']tsx["']/i.test(attrs)) {
    filenameSuffix = '.tsx'
  } else if (/\blang\s*=\s*["']jsx["']/i.test(attrs)) {
    filenameSuffix = '.jsx'
  }

  return {
    code: scriptMatch[2],
    lineOffset: beforeScript.split('\n').length,
    filenameSuffix
  }
}

function consoleLinkPlugin(userOptions = {}) {
  const options = Object.assign({}, DEFAULTS, userOptions)
  let projectRoot = ''
  let devtoolFunctionCode = ''

  if (options.injectDevtoolFunction) {
    const devtoolFunctionPath = path.resolve(__dirname, '../utils/console-devtool-function.js')
    devtoolFunctionCode = fs.readFileSync(devtoolFunctionPath, 'utf-8')
  }

  return {
    name: 'vite-plugin-console-link',
    configResolved(config) {
      projectRoot = config.root || process.cwd()
    },
    transform(code, id) {
      // 一键关闭
      if (!options.enabled) return null

      // 生产环境自动关闭
      if (process.env.NODE_ENV === 'production') return null

      // 跳过 Vue 模板编译产物，避免注入 _sfc_render 等框架函数
      if (VUE_TEMPLATE_RE.test(id)) return null

      // 排除 node_modules
      const normalizedId = id.split('?')[0]
      if (options.exclude && options.exclude.test ? options.exclude.test(normalizedId) : false) {
        return null
      }

      // 只处理 js/ts/vue 文件
      const isJS = JS_RE.test(normalizedId)
      const isVue = VUE_RE.test(normalizedId)
      const isVueScript = VUE_SCRIPT_RE.test(id)

      if (!isJS && !isVue && !isVueScript) return null

      // 如果配置了 include，检查文件是否在 include 范围内
      if (options.include) {
        const relativePath = path.relative(projectRoot, normalizedId)
        const includeRe = options.include instanceof RegExp ? options.include : new RegExp(options.include)
        if (!includeRe.test(relativePath) && !includeRe.test(normalizedId)) {
          return null
        }
      }

      // 白名单文件跳过
      if (isIgnored(normalizedId, options.ignore, projectRoot)) return null

      const filename = normalizedId || 'unknown.js'
      let lineOffset = 0
      let sourceLineMap = null

      if (isVue || isVueScript) {
        try {
          const vueContent = fs.readFileSync(normalizedId, 'utf-8')
          const scriptInfo = getVueScriptInfo(vueContent)
          lineOffset = scriptInfo.lineOffset
          if (scriptInfo.code) {
            sourceLineMap = buildSourceLineMap(scriptInfo.code, {
              filename: normalizedId + scriptInfo.filenameSuffix,
              lineOffset
            })
          }
        } catch (e) {
          // 读取失败则不偏移
        }
      } else {
        try {
          const sourceCode = fs.readFileSync(normalizedId, 'utf-8')
          sourceLineMap = buildSourceLineMap(sourceCode, {
            filename,
            lineOffset: 0
          })
        } catch (e) {
          // 读取失败则不使用源码行号映射
        }
      }

      const result = transform(code, {
        filename,
        injectRuntime: options.injectRuntime,
        lineOffset,
        sourceLineMap
      })

      if (result.map) {
        return { code: result.code, map: result.map }
      }
      return { code: result.code, map: null }
    },
    transformIndexHtml(html) {
      // 只在配置开启时注入
      if (!options.injectDevtoolFunction) return html

      // 直接内联插件自带脚本，避免业务项目额外放置静态文件
      const scriptTag = `<script>\n${devtoolFunctionCode}\n</script>`

      return html.replace('</head>', scriptTag + '</head>')
    }
  }
}

module.exports = consoleLinkPlugin
module.exports.default = consoleLinkPlugin
