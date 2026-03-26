const { transform } = require('../src/core/transform')

// 模拟一段 Vue2 组件的 script 代码
const vueScript = `
export default {
  data() {
    return { count: 0 }
  },
  created() {
    this.fetchData()
  },
  mounted() {
    this.bindEvents()
  },
  computed: {
    doubleCount() {
      return this.count * 2
    }
  },
  watch: {
    count(newVal, oldVal) {
      console.log('changed')
    }
  },
  methods: {
    fetchData() {
      api.getData()
    },
    handleClick(e) {
      this.count++
    },
    handleSubmit(form, options) {
      api.submit(form)
    }
  }
}
`

const result = transform(vueScript, {
  filename: 'App.vue',
  injectRuntime: false  // 不注入运行时，方便看核心转换
})

console.log('====== 转换后的代码 ======\n')
console.log(result.code)
