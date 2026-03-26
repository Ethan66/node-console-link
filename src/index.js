const { transform, RUNTIME_CODE } = require('./core/transform')
const consoleLinkWebpackLoader = require('./webpack/loader')
const consoleLinkVitePlugin = require('./vite/plugin')

module.exports = {
  transform,
  RUNTIME_CODE,
  webpack: consoleLinkWebpackLoader,
  vite: consoleLinkVitePlugin
}
