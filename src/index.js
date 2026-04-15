const { transform, RUNTIME_CODE } = require('./core/transform')
const consoleLinkWebpackLoader = require('./webpack/loader')
const consoleLinkVitePlugin = require('./vite/plugin')
const consoleLinkWebpackPlugin = require('./webpack/plugin')

module.exports = {
  transform,
  RUNTIME_CODE,
  webpack: consoleLinkWebpackLoader,
  webpackPlugin: consoleLinkWebpackPlugin,
  vite: consoleLinkVitePlugin
}
