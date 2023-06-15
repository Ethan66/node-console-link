const a = 1
console.warn('----- my data is a: ', a)

function fn (a = 1, b = 2) {
  const c = a + b
  return c
}

fn()

const obj = {
  fn (a, b) {
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
