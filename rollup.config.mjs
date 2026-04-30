import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import fs from 'fs'
import path from 'path'

// 复制 runtime/utils 文件到 dist（这些文件不参与 bundle，原样保留）
const copyStaticAssets = {
  name: 'copy-static-assets',
  generateBundle() {
    const runtimeDir = path.resolve('dist/runtime')
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true })
    }
    const runtimeCode = fs.readFileSync('src/runtime/index.js', 'utf-8')
    fs.writeFileSync(path.resolve(runtimeDir, 'index.js'), runtimeCode)

    const utilsDir = path.resolve('dist/utils')
    if (!fs.existsSync(utilsDir)) {
      fs.mkdirSync(utilsDir, { recursive: true })
    }
    const devtoolCode = fs.readFileSync('src/utils/console-devtool-function.js', 'utf-8')
    fs.writeFileSync(path.resolve(utilsDir, 'console-devtool-function.js'), devtoolCode)
  }
}

export default [
  // 主入口
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'auto'
    },
    external: [
      '@babel/parser',
      '@babel/traverse',
      '@babel/generator',
      '@babel/types',
      'fs',
      'path'
    ],
    plugins: [resolve(), commonjs(), copyStaticAssets]
  },
  // webpack loader
  {
    input: 'src/webpack/loader.js',
    output: {
      file: 'dist/webpack/loader.js',
      format: 'cjs',
      exports: 'auto'
    },
    external: [
      '@babel/parser',
      '@babel/traverse',
      '@babel/generator',
      '@babel/types',
      'fs',
      'path'
    ],
    plugins: [resolve(), commonjs()]
  },
  // vite plugin
  {
    input: 'src/vite/plugin.js',
    output: {
      file: 'dist/vite/plugin.js',
      format: 'cjs',
      exports: 'auto'
    },
    external: [
      '@babel/parser',
      '@babel/traverse',
      '@babel/generator',
      '@babel/types',
      'fs',
      'path'
    ],
    plugins: [resolve(), commonjs()]
  }
]
