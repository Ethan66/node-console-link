const { transform } = require('../core/transform')

const DEFAULTS = {
  enabled: true,
  injectRuntime: true
}

module.exports = function consoleLinkLoader(source) {
  // 禁用 webpack 缓存，确保 loader 代码变更后立即生效
  this.cacheable(false)
  console.log('[console-link] loader 已加载, 正在处理:', this.resourcePath)

  // 获取 loader options
  const options = Object.assign({}, DEFAULTS, this.getOptions ? this.getOptions() : {})

  // 一键关闭
  if (!options.enabled) return source

  // 生产环境自动关闭
  if (process.env.NODE_ENV === 'production') return source

  const filename = this.resourcePath || 'unknown.js'

  // 排除 node_modules
  if (/node_modules/.test(filename)) return source

  const result = transform(source, {
    filename,
    injectRuntime: options.injectRuntime
  })

  return result.code
}
