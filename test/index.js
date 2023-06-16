const a = '1'
const b = '1234'

function fn(a = 1, b = 2) {
  const c = a + b
  return c
}

fn()

const obj = {
  fn(a, b) {
    return a + b
  }
}

obj.fn(1, 2)

const obj2 = {}

obj2.fn = function (a, b) {
  return a + b
}

const fn3 = (a, b) => {
  return a + b
}

fn3(1, 2)

const defineComponent = ({ a, setup }) => {
  setup(1, 3)
}

const app = defineComponent({
  a: 2,
  setup(a, b) {
    return a + b
  }
})

if (a.length < b.length) {
  const c = 1 + 2
}

new Promise(res => {
  res(123)
}).then(data => {
  console.warn('----- my data is 666: ', 666)
})

if (a === '1' && b === '1234') {
    let aa = 123
}
if (b.startsWith('123')) {
    let aa = 123
}

[1,2,3].map((item) => { 
    item === 1
})
