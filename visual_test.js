const { transform } = require('./src/core/transform');

console.log('=== 示例1：普通函数 ===\n');
const code1 = `function add(a, b) {
  return a + b;
}`;
const result1 = transform(code1, { injectRuntime: false });
console.log('转换后代码：');
console.log(result1.code);

console.log('\n=== 示例2：对象方法 ===\n');
const code2 = `const obj = {
  submit(formData, options) {
    api.post(formData);
  }
}`;
const result2 = transform(code2, { injectRuntime: false });
console.log('转换后代码：');
console.log(result2.code);

console.log('\n=== 示例3：解构参数 ===\n');
const code3 = `function process({ id, name }, isActive) {
  console.log(id, name, isActive);
}`;
const result3 = transform(code3, { injectRuntime: false });
console.log('转换后代码：');
console.log(result3.code);

console.log('\n=== 示例4：应跳过的代码 ===\n');
const code4 = `arr.forEach(item => {
  console.log(item);
});`;
const result4 = transform(code4, { injectRuntime: false });
console.log('转换后代码（应无变化）：');
console.log(result4.code === code4 ? '✓ 代码未变' : result4.code);
