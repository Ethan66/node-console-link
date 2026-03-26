const { transform } = require('../core/transform')
const path = require('path')

const JS_RE = /\.[jt]sx?$/
const VUE_RE = /\.vue$/
// vite 处理 .vue 时会带上 type=script 的 query
const VUE_SCRIPT_RE = /\.vue\?.*type=script/

const DEFAULTS = {
  enabled: true,
  include: null, // 默认处理 src 目录
  exclude: /node_modules/,
  injectRuntime: true
}

function consoleLinkPlugin(userOptions = {}) {
  const options = Object.assign({}, DEFAULTS, userOptions)
  let projectRoot = ''

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
        const includeRe = options.include instanceof RegExp
          ? options.include
          : new RegExp(options.include)
        if (!includeRe.test(relativePath) && !includeRe.test(normalizedId)) {
          return null
        }
      }

      const filename = normalizedId.split('/').pop() || normalizedId.split('\\').pop() || 'unknown.js'

      const result = transform(code, {
        filename,
        injectRuntime: options.injectRuntime
      })

      if (result.map) {
        return { code: result.code, map: result.map }
      }
      return { code: result.code, map: null }
    }
  }
}

module.exports = consoleLinkPlugin
module.exports.default = consoleLinkPlugin
