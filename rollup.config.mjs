import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import fs from 'fs'
import path from 'path'

// 复制 runtime 文件到 dist（runtime 不需要 bundle，原样保留）
const copyRuntime = {
  name: 'copy-runtime',
  generateBundle() {
    const runtimeDir = path.resolve('dist/runtime')
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true })
    }
    const runtimeCode = fs.readFileSync('src/runtime/index.js', 'utf-8')
    fs.writeFileSync(path.resolve(runtimeDir, 'index.js'), runtimeCode)
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
    plugins: [resolve(), commonjs(), copyRuntime]
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
