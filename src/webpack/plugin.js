const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

const PLUGIN_NAME = 'ConsoleLinkWebpackPlugin'
const DEVTOOL_SOURCE_PATH = path.resolve(__dirname, '../utils/console-devtool-function.js')

/**
 * Webpack plugin: inject console-devtool-function.js into HTML
 * and emit the runtime file for html-webpack-plugin v3/v4/v5.
 */
function ConsoleLinkWebpackPlugin(userOptions = {}) {
  const options = Object.assign(
    {
      injectDevtoolFunction: false,
      scriptPath: '',
      filePath: ''
    },
    userOptions
  )

  function validateOptions() {
    if (!options.injectDevtoolFunction) return

    if (!options.scriptPath || !options.filePath) {
      throw new Error(
        `[${PLUGIN_NAME}] scriptPath and filePath are required when injectDevtoolFunction is true`
      )
    }
  }

  function emitDevtoolAsset(compilation, compiler) {
    if (!options.injectDevtoolFunction) return

    const assetContent = fs.readFileSync(DEVTOOL_SOURCE_PATH, 'utf-8')
    const normalizedFilePath = String(options.filePath).replace(/^\/+/, '')

    if (typeof compilation.emitAsset === 'function' && compiler.webpack && compiler.webpack.sources) {
      const { RawSource } = compiler.webpack.sources
      compilation.emitAsset(normalizedFilePath, new RawSource(assetContent))
      return
    }

    compilation.assets[normalizedFilePath] = {
      source() {
        return assetContent
      },
      size() {
        return Buffer.byteLength(assetContent, 'utf8')
      }
    }
  }

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
    validateOptions()

    compiler.hooks.emit.tapAsync(PLUGIN_NAME, function (compilation, cb) {
      try {
        emitDevtoolAsset(compilation, compiler)
        cb()
      } catch (error) {
        cb(error)
      }
    })

    compiler.hooks.compilation.tap(PLUGIN_NAME, function (compilation) {
      const HtmlWebpackPlugin = resolveHtmlWebpackPlugin(compiler)

      if (HtmlWebpackPlugin && typeof HtmlWebpackPlugin.getCompilationHooks === 'function') {
        const hooks = HtmlWebpackPlugin.getCompilationHooks(compilation)
        hooks.beforeEmit.tapAsync(PLUGIN_NAME, injectIntoHtml)
        return
      }

      if (compilation.hooks && compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing) {
        compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing.tapAsync(PLUGIN_NAME, injectIntoHtml)
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
