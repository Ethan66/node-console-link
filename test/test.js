const { transform } = require('../src/core/transform')

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
    expectFnName: '[methods] handleSubmit'
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
  }
]

let passed = 0
let failed = 0

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
      if (hasLink && hasTryFinally) {
        console.log(`\u2705 ${tc.name} - 注入成功，函数名: ${tc.expectFnName}，含 try/finally`)
        passed++
      } else {
        console.log(`\u274C ${tc.name} - 注入失败`)
        console.log('  hasLink:', hasLink, 'hasTryFinally:', hasTryFinally)
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
