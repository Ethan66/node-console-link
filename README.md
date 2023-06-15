## node输出函数链路
A library of supports console function link.
### 前言：
1. 在平常开发的时候，老是要手动输入console，并在打印console的时候还要JSON转换，很麻烦。
2. 在别人开发代码后，在提测阶段是我们进行修改bug，这时候就要去看项目代码，很耗时。

### 解决方案：
在某个文件或者某个目录的所有文件下的每个函数头部自动添加console.log，加上打印值，第一个为打印函数的名称，参照vue-devtool的样式，显得醒目。从第二个值开始是参数，对象会转为JSON对象


#### 使用说明

```
// 通过npm安装
npm i -g node-console-link
```

#### 使用
```
// 支持文件：vue, js, ts, jsx, tsx
// 终端
$ pr-link ./index.vue
$ pr-link ./src
```