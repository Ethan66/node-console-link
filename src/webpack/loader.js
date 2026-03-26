const path = require('path')
const { transform } = require('../core/transform')

const DEFAULTS = {
  enabled: true,
  injectRuntime: true,
  ignore: [] // 白名单文件路径列表，如 ['src/utils/network.js']
}

/**
 * 检查文件是否在白名单中
 * 将 resourcePath 转为相对路径，与 ignore 列表逐一匹配
 */
function isIgnored(resourcePath, ignoreList, context) {
  if (!ignoreList || ignoreList.length === 0) return false
  // 统一用 / 分隔
  const relativePath = path.relative(context, resourcePath).replace(/\\/g, '/')
  return ignoreList.some(function(pattern) {
    const p = pattern.replace(/\\/g, '/')
    if (relativePath === p || relativePath.endsWith('/' + p)) return true
    if (relativePath.startsWith(p + '/')) return true
    return false
  })
}

function consoleLinkLoader(source) {
  // 禁用 webpack 缓存，确保 loader 代码变更后立即生效
  this.cacheable(false)
  // 获取 loader options（兼容 webpack4 和 webpack5）
  let userOptions = {}
  if (typeof this.getOptions === 'function') {
    try {
      userOptions = this.getOptions({ type: 'object', additionalProperties: true }) || {}
    } catch (e) {
      userOptions = this.getOptions() || {}
    }
  } else if (this.query && typeof this.query === 'object') {
    userOptions = this.query
  }
  const options = Object.assign({}, DEFAULTS, userOptions)

  // 一键关闭
  if (!options.enabled) return source

  // 生产环境自动关闭
  if (process.env.NODE_ENV === 'production') return source

  const filename = this.resourcePath || 'unknown.js'

  // 排除 node_modules
  if (/node_modules/.test(filename)) return source

  // 白名单文件跳过
  const context = this.rootContext || this.context || process.cwd()
  if (isIgnored(filename, options.ignore, context)) return source

  const result = transform(source, {
    filename,
    injectRuntime: options.injectRuntime
  })

  return result.code
}

consoleLinkLoader.schema = {
  type: 'object',
  properties: {
    enabled: { type: 'boolean' },
    injectRuntime: { type: 'boolean' },
    ignore: { type: 'array', items: { type: 'string' } }
  },
  additionalProperties: false
}

module.exports = consoleLinkLoader
