/**
 * Webpack 插件：在 HTML 中注入 console-devtool-function.js
 * 依赖 html-webpack-plugin 的 beforeEmit hook
 */
function ConsoleLinkWebpackPlugin(userOptions = {}) {
  const options = Object.assign(
    {
      injectDevtoolFunction: false,
      scriptPath: './src/utils/console-devtool-function.js'
    },
    userOptions
  )

  this.apply = function (compiler) {
    compiler.hooks.thisCompilation.tap('ConsoleLinkWebpackPlugin', function (compilation) {
      // 动态获取 html-webpack-plugin 的 hooks
      // 如果插件未安装，静默失败
      try {
        const HtmlWebpackPlugin = require('html-webpack-plugin')
        const hooks = HtmlWebpackPlugin.getCompilationHooks(compilation)

        hooks.beforeEmit.tapAsync('ConsoleLinkWebpackPlugin', function (data, cb) {
          if (!options.injectDevtoolFunction) {
            return cb(null, data)
          }

          const scriptTag = `<script src="${options.scriptPath}"></script>`
          data.html = data.html.replace('</head>', scriptTag + '</head>')

          cb(null, data)
        })
      } catch (e) {
        // html-webpack-plugin 未安装时静默失败
      }
    })
  }
}

module.exports = ConsoleLinkWebpackPlugin
module.exports.default = ConsoleLinkWebpackPlugin
