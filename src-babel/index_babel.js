const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const { transformFromAstSync } = require('@babel/core')
const prettier = require('prettier')

const gradientColorMap = new Map([
  ['yellow', 'linear-gradient(to right, #FDB813, #FFAA00)'],
  ['orange', 'linear-gradient(to right, #FFA500, #FF6347)'],
  ['red', 'linear-gradient(to right, #FF416C, #FF4B2B)'],
  ['green', 'linear-gradient(to right, #00b09b, #96c93d)'],
  ['cyan', 'linear-gradient(to right, #1D976C, #93F9B9)'],
  ['blue', 'linear-gradient(to right, #2196F3, #4FC3F7)'],
  ['purple', 'linear-gradient(to right, #DA22FF, #9733EE)']
])

const randomColor = Array.from(gradientColorMap.keys())[Math.floor(Math.random() * gradientColorMap.size)]

const getDirectory = () => {
  // 从命令行参数中获取要遍历的目录路径
  const args = process.argv.slice(2)
  const dirOptionIndex = args.findIndex(arg => arg === '--target')
  const dirPath = dirOptionIndex >= 0 ? args[dirOptionIndex + 1] : null

  // 检查目录路径是否存在
  if (!dirPath) {
    console.error('请指定目录路径: Example: node config.js --target ./src')
    return ''
  }
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory ${dirPath} does not exist.`)
    return ''
  }
  return dirPath
}

const dirPath = getDirectory()

// 遍历目录
function traverseDir (dir, callback) {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      traverseDir(filePath, callback)
    } else {
      if (/\.(js|ts|vue)$/i.test(filePath)) {
        callback(filePath)
      }
    }
  })
}

// 处理文件
function processFile (filePath) {
  console.log(`Processing ${filePath}...`)

  // 读取文件内容
  const code = fs.readFileSync(filePath, 'utf-8')

  // 将代码解析为AST并遍历
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  })
  traverse(ast, {
    FunctionDeclaration (path) {
      insertConsoleLog(path)
    },
    ArrowFunctionExpression (path) {
      insertConsoleLog(path)
    },
    FunctionExpression (path) {
      insertConsoleLog(path)
    }
  })

  // 将修改后的AST转换回代码并保存到文件
  const output = transformFromAstSync(ast, null, {
  }).code
  // 格式化代码
  const formattedCode = prettier.format(output, {
    tabWidth: 2,
    useTabs: false,
    semi: false,
    singleQuote: true,
    quoteProps: 'as-needed',
    trailingComma: 'none',
    bracketSpacing: true,
    arrowParens: 'avoid',
    rangeStart: 0,
    requirePragma: false,
    insertPragma: false,
    proseWrap: 'never',
    htmlWhitespaceSensitivity: 'css',
    vueIndentScriptAndStyle: false,
    endOfLine: 'lf'
  })
  fs.writeFileSync(filePath, formattedCode)
}

// 在函数头部插入console.log语句
function insertConsoleLog (path) {
  // 如果函数头部已经包含了console.log语句，则不添加
  const hasConsoleLog = path.get('body').get('body')[0]?.node?.expression?.callee?.object?.name === 'console'
  if (hasConsoleLog) {
    return
  }
  const name = path.node.id ? path.node.id.name : 'anonymous'
  const params = path.node.params.map((param) => param.name).join(', ')
  const prefix = [
    `%c${name}`,
    `background-image: ${gradientColorMap.get(randomColor)}; padding: 4px 8px; border-radius: 2px; font-size: 14px; color: #fff; font-weight: 600;`]
  const logStatement = `console.log('${prefix[0]}', '${prefix[1]}', ${params})\n`
  path.get('body').unshiftContainer('body', parser.parse(logStatement).program.body[0])
}

// 开始遍历
dirPath && traverseDir(dirPath, processFile)
