const { createRequire } = require('module')

/**
 * Webpack 插件：在 HTML 中注入 console-devtool-function.js
 * 兼容 html-webpack-plugin v3/v4+
 */
function ConsoleLinkWebpackPlugin(userOptions = {}) {
  const options = Object.assign(
    {
      injectDevtoolFunction: false,
      scriptPath: './src/utils/console-devtool-function.js'
    },
    userOptions
  )

  function injectIntoHtml(data, cb) {
    if (!options.injectDevtoolFunction) return cb(null, data)

    if (!data || typeof data.html !== 'string') return cb(null, data)
    if (data.html.indexOf(options.scriptPath) !== -1) return cb(null, data)

    const scriptTag = `\n<script>console.log('[console-devtool-function] loaded', '${options.scriptPath}')</script>\n<script src="${options.scriptPath}"></script>`

    if (/<\/head>/i.test(data.html)) {
      data.html = data.html.replace(/<\/head>/i, scriptTag + '\n</head>')
    } else {
      data.html += scriptTag
    }

    cb(null, data)
  }

  function resolveHtmlWebpackPlugin(compiler) {
    try {
      return require('html-webpack-plugin')
    } catch (e) {
      try {
        const req = createRequire(compiler.context + '/')
        return req('html-webpack-plugin')
      } catch (innerErr) {
        return null
      }
    }
  }

  this.apply = function (compiler) {
    compiler.hooks.compilation.tap('ConsoleLinkWebpackPlugin', function (compilation) {
      const HtmlWebpackPlugin = resolveHtmlWebpackPlugin(compiler)

      // html-webpack-plugin v4/v5
      if (HtmlWebpackPlugin && typeof HtmlWebpackPlugin.getCompilationHooks === 'function') {
        const hooks = HtmlWebpackPlugin.getCompilationHooks(compilation)
        hooks.beforeEmit.tapAsync('ConsoleLinkWebpackPlugin', injectIntoHtml)
        return
      }

      // html-webpack-plugin v3（Vue CLI 4 常见）
      if (compilation.hooks && compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing) {
        compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing.tapAsync('ConsoleLinkWebpackPlugin', injectIntoHtml)
        return
      }
      if (typeof compilation.plugin === 'function') {
        compilation.plugin('html-webpack-plugin-before-html-processing', injectIntoHtml)
      }
    })
  }
}

module.exports = ConsoleLinkWebpackPlugin
module.exports.default = ConsoleLinkWebpackPlugin
