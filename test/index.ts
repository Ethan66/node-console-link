/**
 * @title 搜素框数据格式化
 * @describe 将数组转换成[{ label: ''、value: '' }]
 * @param {Array} data 处理的对象数组
 * @param {String} label 名称的字段
 * @param {String} value 值的字段值的字段
 */
export const formatArrData = (
    data: any[],
    label: string | number,
    value: string | number
  ) => {
    if (!Array.isArray(data)) {
      throw new Error('传参错误：data为数组')
    }
    return data.map(item => ({ label: item[label], value: item[value] }))
  }
  
  /**
   * @name 列表框数据格式化
   * @param {Array} opt 处理的对象数组
   * @param {String} label 名称的字段
   * @param {String} value 值的字段值的字段
   */
  export const formatArrLabel = (opt: any[], val: number | string) => {
    // console.warn('----- my data is opt, val: ', opt, val)
    return (
      opt.find((item: { value: string | number }) => item.value === val) || {}
    ).label
  }
  
  // 通用下载方法
  export function onDownload(res: any) {
    let name = res.headers['content-disposition']?.split('=')[1]
    name = name.includes("''") ? name.split("''")[1] : name
    const blob = new Blob([res.data])
    const url = URL.createObjectURL(blob)
    const link = Object.assign(document.createElement('a'), {
      download: decodeURI(name),
      href: url,
      style: 'display: none;'
    })
    document.body.appendChild(link).click()
    URL.revokeObjectURL(url)
    document.body.removeChild(link)
  }
  
  /**
   * 日期格式化
   */
  export function dateFormat(date: any, ft = 'yyyy-MM-dd HH:mm:ss') {
    let format = ft
    if (date != 'Invalid Date') {
      const o = {
        'M+': date.getMonth() + 1, //month
        'd+': date.getDate(), //day
        'h+': date.getHours(), //hour
        'H+': date.getHours(), //hour
        'm+': date.getMinutes(), //minute
        's+': date.getSeconds(), //second
        'q+': Math.floor((date.getMonth() + 3) / 3), //quarter
        S: date.getMilliseconds() //millisecond
      }
      if (/(y+)/.test(format))
        format = format.replace(
          RegExp.$1,
          (date.getFullYear() + '').substr(4 - RegExp.$1.length)
        )
      for (const k in o)
        if (new RegExp('(' + k + ')').test(format))
          format = format.replace(
            RegExp.$1,
            RegExp.$1.length == 1
              ? o[k]
              : ('00' + o[k]).substr(('' + o[k]).length)
          )
      return format
    }
    return ''
  }
  
  /**
   * @name 日期时间格式化
   * @param {String} timestamp 时间戳
   * @param {String} type 格式化类型
   */
  export const formatDateTime = (timestamp: number, type: string) => {
    const date = new Date(timestamp) //时间戳为10位需*1000，时间戳为13位的话不需乘1000
    const Y = date.getFullYear(),
      M =
        date.getMonth() + 1 < 10
          ? '0' + (date.getMonth() + 1)
          : date.getMonth() + 1,
      D = date.getDate() < 10 ? '0' + date.getDate() : date.getDate(),
      h = date.getHours() < 10 ? '0' + date.getHours() : date.getHours(),
      m = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes(),
      s = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()
    if (type === 'YYYY-MM-DD HH:mm:ss') {
      return Y + '-' + M + '-' + D + ' ' + h + ':' + m + ':' + s
    } else if (type === 'HH:mm:ss') {
      return h + ':' + m + ':' + s
    }
  }
  
  /**
   * 净化对象数组中的空字符串
   * @param data 最好是对象和数组，其他直接返回原数据
   * @returns
   */
  export const purifyEmptyString = (data: any, target?: boolean) => {
    if (typeof data !== 'object' || data === null) return data
    return Object.entries(data).reduce((result: any, [k, val]: [string, any]) => {
      if (val !== '') result[k] = val
      else if (target) delete data[k]
      return result
    }, {})
  }
  