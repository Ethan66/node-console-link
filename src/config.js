const gradientColorMap = new Map([
  ['yellow', 'linear-gradient(90deg, #FDB813, #FFAA00)'],
  ['orange', 'linear-gradient(90deg, #FFA500, #FF6347)'],
  ['red', 'linear-gradient(90deg, #FF416C, #FF4B2B)'],
  ['green', 'linear-gradient(90deg, #00b09b, #96c93d)'],
  ['blue', 'linear-gradient(90deg, #2196F3, #4FC3F7)'],
  ['purple', 'linear-gradient(90deg, #9733EE, #DA22FF)']
])

const NATIVE_MAP_METHODS = [
  'forEach',
  'map',
  'reduce',
  'filter',
  'find',
  'every',
  'some',
  'sort',
  'keys',
  'values',
  'entries'
] // 原生js遍历api，打印就太多了
const NEW_NATIVE_MAP_METHODS = NATIVE_MAP_METHODS.map(apiName => `${apiName}(`)

const randomColor = Array.from(gradientColorMap.keys())[Math.floor(Math.random() * gradientColorMap.size)]
const prefixFn = [
  '%c',
  `background: ${gradientColorMap.get(randomColor)}; padding: 1px 6px; color: #fff; border-radius: 2px;`
]
const prefixArg = ['%c', `background: #35495e; padding: 1px 6px; color: #fff; border-radius: 2px;`]

module.exports = {
  NATIVE_MAP_METHODS,
  NEW_NATIVE_MAP_METHODS,
  prefixFn,
  prefixArg
}
