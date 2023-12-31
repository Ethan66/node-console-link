module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  extends: 'standard-with-typescript',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    indent: ['warn', 2],
    quotes: ['warn', 'single'],
    eqeqeq: ['error', 'always']
  }
}
