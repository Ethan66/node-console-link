const { transform } = require('../src/core/transform')
const vm = require('vm')

// 测试用例
const testCases = [
  {
    name: '普通函数声明',
    input: `function handleClick(e) {
  doSomething(e)
}`,
    expectFnName: 'handleClick'
  },
  {
    name: '箭头函数',
    input: `const getData = (id, type) => {
  return fetch(id)
}`,
    expectFnName: 'getData'
  },
  {
    name: '对象方法',
    input: `const obj = {
  methods: {
    handleSubmit(form) {
      submit(form)
    }
  }
}`,
    expectFnName: 'handleSubmit'
  },
  {
    name: 'Vue 生命周期',
    input: `export default {
  created() {
    this.init()
  },
  mounted() {
    this.bindEvents()
  }
}`,
    expectFnName: '[lifecycle] created'
  },
  {
    name: 'computed',
    input: `export default {
  computed: {
    fullName() {
      return this.first + this.last
    }
  }
}`,
    expectFnName: '[computed] fullName'
  },
  {
    name: 'watch',
    input: `export default {
  watch: {
    value(newVal, oldVal) {
      this.onChange(newVal)
    }
  }
}`,
    expectFnName: '[watch] value'
  },
  {
    name: '应跳过 forEach 回调',
    input: `const list = [1, 2, 3]
list.forEach(item => {
  console.log(item)
})`,
    expectSkip: true
  },
  {
    name: 'TS 参数类型注解',
    input: `function getUser(id: number, name: string) {
  return api.get(id)
}`,
    expectFnName: 'getUser',
    expectApiCalls: ['api.get'],
    runtimeInput: `function getUser(id, name) {
  return api.get(id)
}`,
    execute: `getUser(1, 'tom')`,
    filename: 'test.ts'
  },
  {
    name: '解构参数',
    input: `function handleUpdate({ id, name }, options) {
  save(id, name)
}`,
    expectFnName: 'handleUpdate'
  },
  {
    name: '无块语句体的箭头函数应跳过',
    input: `const double = x => x * 2`,
    expectSkip: true
  },
  {
    name: '记录 api 成员调用完整前缀',
    input: `function loadData(id) {
  return api.xx.get(id)
}`,
    expectFnName: 'loadData',
    expectApiCalls: ['api.xx.get'],
    execute: `loadData(1)`
  },
  {
    name: '记录对象名包含 api 的成员调用',
    input: `function submit() {
  return myApi.fetch()
}`,
    expectFnName: 'submit',
    expectApiCalls: ['myApi.fetch'],
    execute: `submit()`
  },
  {
    name: '记录 api 前缀独立函数调用',
    input: `function send(data) {
  return apiPost(data)
}`,
    expectFnName: 'send',
    expectApiCalls: ['apiPost'],
    execute: `send({ id: 1 })`
  },
  {
    name: '记录 TS 泛型 api 调用 <any>',
    input: `async function loadBorrowInfo() {
  return await apiBorrowMain.getBorrowApplyInfo.post<any>()
}`,
    expectFnName: 'loadBorrowInfo',
    expectApiCalls: ['apiBorrowMain.getBorrowApplyInfo.post'],
    runtimeInput: `function loadBorrowInfo() {
  return apiBorrowMain.getBorrowApplyInfo.post()
}`,
    execute: `loadBorrowInfo()`,
    filename: 'test.ts'
  },
  {
    name: '记录 TS 泛型 api 调用 <{ a: 1, b: 2 }>',
    input: `async function loadBorrowTyped() {
  return await apiBorrowMain.getBorrowApplyInfo.post<{ a: 1, b: 2 }>()
}`,
    expectFnName: 'loadBorrowTyped',
    expectApiCalls: ['apiBorrowMain.getBorrowApplyInfo.post'],
    runtimeInput: `function loadBorrowTyped() {
  return apiBorrowMain.getBorrowApplyInfo.post()
}`,
    execute: `loadBorrowTyped()`,
    filename: 'test.ts'
  },
  {
    name: '请求方法后链式 then 时截断到 post',
    input: `function loadProtocol(sceneCode) {
  return apiCommon.apiGetProtocolList.post({ sceneCodeList: [sceneCode] }).then(res => res)
}`,
    expectFnName: 'loadProtocol',
    expectApiCalls: ['apiCommon.apiGetProtocolList.post'],
    execute: `loadProtocol('A')`
  },
  {
    name: '忽略未执行的 api 引用',
    input: `function pickApi() {
  const apiMyname = api.metho || api.methos2
  return apiMyname
}`,
    expectFnName: 'pickApi',
    expectApiCalls: [],
    execute: `pickApi()`
  },
  {
    name: '忽略内部函数中的 api 调用',
    input: `function outer() {
  function inner() {
    return api.get()
  }
  return inner
}`,
    expectFnName: 'outer',
    expectApiCalls: [],
    execute: `outer()`
  }
]

let passed = 0
let failed = 0

function getCapturedApiCalls(tc) {
  if (!tc.execute) return null

  const runtimeInput = tc.runtimeInput || tc.input
  const runtimeFilename = tc.runtimeFilename || 'runtime-check.js'
  const result = transform(`${runtimeInput}\n${tc.execute}`, {
    filename: runtimeFilename,
    injectRuntime: true
  })

  const sent = []
  const context = {
    console: {
      log() {},
      warn() {}
    },
    setTimeout(fn) {
      fn()
      return 1
    },
    clearTimeout() {},
    sendConsoleToExtension(data) {
      sent.push(JSON.parse(JSON.stringify(data)))
    },
    api: {
      get() { return 1 },
      xx: {
        get() { return 1 }
      },
      metho: 'x',
      methos2: 'y'
    },
    myApi: {
      fetch() { return 1 }
    },
    apiCommon: {
      apiGetProtocolList: {
        post() {
          return {
            then(fn) {
              return typeof fn === 'function' ? fn(1) : 1
            }
          }
        }
      }
    },
    apiBorrowMain: {
      getBorrowApplyInfo: {
        post() { return Promise.resolve(1) }
      }
    },
    apiPost() { return 1 },
    fetch() { return 1 },
    doSomething() {},
    submit() {},
    save() {}
  }
  context.window = context
  context.globalThis = context
  context.global = context

  vm.runInNewContext(result.code, context)

  if (!sent.length) return null
  const payload = sent[0][tc.expectFnName]
  return payload ? payload.api : null
}

for (const tc of testCases) {
  try {
    const result = transform(tc.input, {
      filename: tc.filename || 'test.js',
      injectRuntime: false
    })

    if (tc.expectSkip) {
      if (result.code === tc.input) {
        console.log(`\u2705 ${tc.name} - 正确跳过`)
        passed++
      } else {
        console.log(`\u274C ${tc.name} - 应该跳过但被注入了`)
        console.log('  输出:', result.code.slice(0, 100))
        failed++
      }
    } else {
      const hasLink = result.code.includes('__CONSOLE_LINK__') && result.code.includes(`"${tc.expectFnName}"`)
      const hasTryFinally = result.code.includes('try') && result.code.includes('finally') && result.code.includes('__cl')
      const expectedApiCalls = tc.expectApiCalls || null
      const hasExpectedApiCalls = expectedApiCalls
        ? expectedApiCalls.every(apiName => result.code.includes(`"${apiName}"`))
        : true
      const runtimeApiCalls = expectedApiCalls ? getCapturedApiCalls(tc) : null
      const runtimeApiMatch = expectedApiCalls
        ? Array.isArray(runtimeApiCalls) &&
          runtimeApiCalls.length === expectedApiCalls.length &&
          runtimeApiCalls.every((apiName, index) => apiName === expectedApiCalls[index])
        : true
      if (hasLink && hasTryFinally && hasExpectedApiCalls && runtimeApiMatch) {
        console.log(`\u2705 ${tc.name} - 注入成功，函数名: ${tc.expectFnName}，含 try/finally`)
        passed++
      } else {
        console.log(`\u274C ${tc.name} - 注入失败`)
        console.log('  hasLink:', hasLink, 'hasTryFinally:', hasTryFinally, 'hasExpectedApiCalls:', hasExpectedApiCalls, 'runtimeApiCalls:', runtimeApiCalls)
        console.log('  输出:', result.code.slice(0, 300))
        failed++
      }
    }
  } catch (e) {
    console.log(`\u274C ${tc.name} - 异常: ${e.message}`)
    failed++
  }
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败, 共 ${testCases.length} 个用例`)
process.exit(failed > 0 ? 1 : 0)
