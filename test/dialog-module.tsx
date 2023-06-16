import { computed, defineComponent, ref, toRefs, unref } from 'vue'
import FormItem from './form-item'
const App = defineComponent({
  props: {
    dialog: {
      type: Object,
      required: true
    }
  },

  setup(props, context) {
    const { dialog } = toRefs(props)
    const form = unref(dialog)
    const { slots } = context
    const ruleFormRef = ref()
    /**
     * name: 获取显示的配置项
     */
    const fields = computed(() => {
      return Object.keys(config.value).filter(
        key => !key.startsWith('$') && config.value[key].show === true
      )
    })
    const config = computed(() => {
      return form.config
    })
    const maxLabelWidth = computed(() => {
      return fields.value.reduce((res, key) => {
        const len = config.value[key].label.length
        return res > len ? res : len
      }, 0)
    })

    /**
     * name: 获取dialog自定义配置属性
     */
    const parentAttr = computed(() => {
      return Object.keys(form).reduce((data, key) => {
        if (['title', 'close-on-click-modal'].includes(key)) {
          data[key] = form[key]
        }
        return data
      }, {})
    })

    /**
     * name: dialog提交按钮事件
     */
    const onSubmit = () => {
      const value = { ...form.data }
      Object.keys(value).forEach(key => {
        if (/\w+,\w+/.test(key)) {
          const tmpKeys = key.split(',')
          const tmp = value[key] || []
          value[tmpKeys[0]] = tmp[0]
          value[tmpKeys[1]] = tmp[1]
          delete value[key]
        }
      })
      ruleFormRef.value.validate((valid: boolean) => {
        if (valid) {
          form.submit(form.data, form, form.table)
        }
      })
    }

    /**
     * name: dialog取消按钮事件
     */
    const onCancel = () => {
      ruleFormRef.value.resetFields()
      form.show = false
    }

    return () => (
      <el-dialog
        class="dialog-module"
        v-model={form.show}
        {...parentAttr.value}
      >
        {{
          default: () => {
            return (
              <el-form
                model={form.data}
                size={form.size}
                label-width={`${maxLabelWidth.value * 20}px`}
                rules={config.value.$rules}
                ref={ruleFormRef}
                key={form.data}
                inline
              >
                {fields.value.map(key => {
                  const value = config.value[key]
                  if (value.slot) {
                    return (
                      <el-form-item
                        style={{ width: `calc(${form['item-width']} - 20px)` }}
                        class={config.value[key].$attr.class || ''}
                        key={key}
                        label={value.label}
                        prop={value.key}
                      >
                        <FormItem
                          form={config.value}
                          field={key}
                          data={form.data}
                          item={config.value[key]}
                          slots={slots}
                        ></FormItem>
                      </el-form-item>
                    )
                  } else {
                    return (
                      <el-form-item
                        style={{ width: `calc(${form['item-width']} - 20px)` }}
                        class={config.value[key].$attr.class || ''}
                        key={key}
                        label={value.label}
                        prop={value.key}
                      >
                        <FormItem
                          form={config.value}
                          field={key}
                          data={form.data}
                          item={config.value[key]}
                        ></FormItem>
                      </el-form-item>
                    )
                  }
                })}
              </el-form>
            )
          },
          footer: () => {
            if (slots.btn) {
              return <div>{slots.btn?.()}</div>
            } else {
              return (
                <div>
                  <el-button onClick={onCancel}>取消</el-button>
                  <el-button type="primary" onClick={onSubmit}>
                    确定
                  </el-button>
                </div>
              )
            }
          }
        }}
      </el-dialog>
    )
  }
})

export default App
