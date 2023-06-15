import { terser } from 'rollup-plugin-terser'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import fs from 'fs'

let content = fs.readFileSync('./package.json', 'utf-8')
content = content.replace(/("version": ")(\d+\.\d+\.)(\d+)/, (str, a, b, c) => {
  return a + b + String(Number(c) + 1)
})
fs.writeFileSync('./package.json', content)

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs'
  },
  plugins: [
    terser(),
    resolve(),
    commonjs(),
    {
      name: 'add-shebang',
      generateBundle (options, bundle) {
        Object.keys(bundle).forEach(fileName => {
          const code = bundle[fileName].code
          bundle[fileName].code = '#!/usr/bin/env node\n' + code
        })
      }
    }
  ]
}
