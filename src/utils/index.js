const fs = require('fs')
const chalk = require('chalk')
const { NATIVE_MAP_METHODS, NEW_NATIVE_MAP_METHODS, prefix } = require('../config')

const getDirectory = () => {
  // 从命令行参数中获取要遍历的目录路径
  const dirPath = process.argv.slice(2)[0]

  // 检查目录路径是否存在
  if (!dirPath) {
    console.log(chalk.red('Fail: 请指定目录路径或文件路径: Example: pr-link ./src'))
    return ''
  }
  if (!fs.existsSync(dirPath)) {
    console.log(chalk.red(`Fail: Directory or File ${dirPath} does not exist.`))
    return ''
  }
  return dirPath
}

// 获取非空白符的函数体，剔除打印过的
const getRealFun = fnContext => {
  const match = fnContext.match(/\S+/)
  if (match) {
    if (match[0].startsWith("console.log('%c")) {
      // 打印过的不需要再打印
      return ''
    } else {
      return fnContext
    }
  } else {
    return ''
  }
}

// 处理fnName
const getPureFnName = fnName => {
  let result = ''
  fnName = fnName.replace(/^.*?([\w_\s=]+)$/, '$1')
  result = fnName
  const temp = fnName.split('=')
  // 说明是function fn(){} 或者{ fn(a, b) {}}
  if (temp.length === 1) {
    result = temp[0].replace(/^.*?(?:function)?\s*([\w_]+)\s*$/, '$1')
    // 说明是obj2.fn = function() {} 或者const fn3 = (a, b) => {}
  } else if (temp.length === 2) {
    result = temp[0].replace(/^.*?\s*([\w_.]+)\s*$/, '$1')
  }
  result = result.replace(/\r/g, '')
  return result
}

// 处理ts中的arg，只拿到arg
const getPureArg = arg => {
  const result = arg.split(',').reduce((data, cur, i) => {
    if (i > 0) {
      data += ', '
    }
    data += cur.replace(/^[\s\S]*?([\w_]+)[\s\S]*$/, '$1')
    return data
  }, '')

  return result
}

// 对arg进行JSON处理
const getCopyArg = arg => {
  return arg.replace(/\w+/g, str => {
    return `typeof ${str} === 'object' ? JSON.parse(JSON.stringify(${str})) : ${str}`
  })
}

// 获取添加的console
const getConsoleContent = (fnName, arg, fnContext) => {
  const blankSpace = fnContext.replace(/(\s*).+[\S\s]*/, '$1')
  const newArg = getCopyArg(arg)
  return `${blankSpace}console.log('${prefix[0] + fnName}', '${prefix[1]}'${arg ? `, ${newArg}` : ''});`
}

// 获取添加console的新的函数代码
const getAddConsoleFunCode = (fnCode, consoleContent) => {
  return fnCode + consoleContent
}

// 获取函数代码对象
const getFunCodeOb = code => {
  let result = {
    str: '',
    fnName: '',
    arg: '',
    fnContext: '',
    index: 0
  }
  // abandoned   const funRegStr = '(\\S+)\\s*\\(([^)]*)\\)\\s*\\{(\\s*[^}]+)\\s*\\}'
  // abandoned  const arrowFunRegStr = '(\\S+)\\s*\\=\\s*\\(([^)]*)\\)\\s*\\=\\>\\s*\\{(\\s*[^}]+)\\s*\\}'
  code.replace(/([^\n;]+)\s*\(([^)]*?)(?=\)|=>)\)?\s*(?:=>)?\s*\{(\s*[^\n]+)/, (str, fnName, arg, fnContext, index) => {
    result = { str, fnName, arg, fnContext, index }
    result.str = str.slice(0, str.indexOf(fnContext))
    result.fnContext = getRealFun(fnContext)
    if (result.fnContext) {
      result.fnName = getPureFnName(fnName)
      if (!result.fnName) {
        result.fnContext = ''
        return result
      }
      // 关键字剔除
      if (['for', 'switch', ...NATIVE_MAP_METHODS].includes(result.fnName)) {
        result.fnContext = ''
        return result
      }
      // 回调函数也剔除，主要是剔除调forEach((item, i) => {})这种
      if (NEW_NATIVE_MAP_METHODS.some(newApiName => fnName.endsWith(newApiName))) {
        result.fnContext = ''
        return result
      }
      result.arg = getPureArg(arg)
    }
  })
  //   console.warn("----- my data is result: ", result);
  return result
}

// 获取添加后的代码
const getNewCode = (code, extension) => {
  if (!code) return ''
  let result = ''
  if (extension === 'vue') {
    const index = code.indexOf('</template>')
    if (index > -1) {
      result += code.slice(0, index)
      code = code.slice(index)
    }
  }
  const funCodeOb = getFunCodeOb(code)
  if (funCodeOb.str && funCodeOb.fnContext) {
    const { str, fnName, arg, fnContext, index } = funCodeOb
    result += code.slice(0, index)
    const consoleContent = getConsoleContent(fnName, arg, fnContext)
    result += getAddConsoleFunCode(str, consoleContent)
    code = code.slice(index + str.length)
    result += getNewCode(code)
    return result
  } else if (funCodeOb.str && !funCodeOb.fnContext) {
    result += code.slice(0, funCodeOb.index + funCodeOb.str.length)
    code = code.slice(funCodeOb.index + funCodeOb.str.length)
    result += getNewCode(code)
    return result
  } else {
    return code
  }
}

module.exports = {
  getDirectory,
  getRealFun,
  getPureFnName,
  getPureArg,
  getCopyArg,
  getConsoleContent,
  getNewCode
}
