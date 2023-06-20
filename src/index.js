const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const { getDirectory, getNewCode } = require('./utils/index')

const dirPath = getDirectory()

// 遍历目录
function traverseDir(dir, callback) {
  if (!fs.statSync(dir).isDirectory()) {
    callback(dir)
    return
  }
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      traverseDir(filePath, callback)
    } else {
      if (/\.(js|ts|jsx|tsx|vue)$/i.test(filePath)) {
        callback(filePath)
      }
    }
  })
}

// 处理文件
function processFile(filePath) {
  console.log(`Processing ${filePath}...`)

  // 读取文件内容
  const code = fs.readFileSync(filePath, 'utf-8')
  let newCode = ''
  const extension = filePath.replace(/^.+\./, '')
  if (extension === 'vue') {
    const scriptIndex = code.indexOf('<script')
    const scriptLastIndex = code.indexOf('</script>')
    newCode =
      code.slice(0, scriptIndex) + getNewCode(code.slice(scriptIndex, scriptLastIndex)) + code.slice(scriptLastIndex)
  } else {
    newCode = getNewCode(code)
  }
  fs.writeFileSync(filePath, newCode)
  console.log(chalk.green(`Success: ${filePath}`))
}

// 开始遍历
dirPath && traverseDir(dirPath, processFile)
