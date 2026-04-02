const { transform } = require('./src/core/transform');

const code = `function hello(name, age) {
  console.log(name, age);
  return name + age;
}`;

const result = transform(code, { injectRuntime: false });
console.log(result.code);
