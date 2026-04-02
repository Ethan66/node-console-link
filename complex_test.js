const { transform } = require('./src/core/transform');

const code = `const obj = {
  handler(event, data) {
    console.log(event, data);
    return data;
  },
  async submit(form = {}, { timeout = 5000 } = {}) {
    const result = await api.post(form);
    return result;
  }
}

const arr = [1, 2, 3];
arr.forEach((item) => {
  console.log(item);
});

const filter = arr.filter((item) => item > 1);`;

const result = transform(code, { injectRuntime: true });
console.log(result.code);
