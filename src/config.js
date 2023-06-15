const gradientColorMap = new Map([
  ['yellow', 'linear-gradient(to right, #FDB813, #FFAA00)'],
  ['orange', 'linear-gradient(to right, #FFA500, #FF6347)'],
  ['red', 'linear-gradient(to right, #FF416C, #FF4B2B)'],
  ['green', 'linear-gradient(to right, #00b09b, #96c93d)'],
  ['cyan', 'linear-gradient(to right, #1D976C, #93F9B9)'],
  ['blue', 'linear-gradient(to right, #2196F3, #4FC3F7)'],
  ['purple', 'linear-gradient(to right, #DA22FF, #9733EE)']
])

const NATIVE_MAP_METHODS = ['forEach', 'map', 'reduce', 'filter', 'find', 'every', 'some', 'sort', 'keys', 'values', 'entries'] // 原生js遍历api，打印就太多了
const NEW_NATIVE_MAP_METHODS = NATIVE_MAP_METHODS.map(apiName => `${apiName}(`)

const randomColor = Array.from(gradientColorMap.keys())[Math.floor(Math.random() * gradientColorMap.size)]
const prefix = [
  '%c',
  `background: ${gradientColorMap.get(randomColor)}; padding: 1px 6px; color: #fff; border-radius: 2px;`]

module.exports = {
  NATIVE_MAP_METHODS, NEW_NATIVE_MAP_METHODS, prefix
}
