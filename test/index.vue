<template>
  <div id="channel-dialog-setting">
    <el-dialog title="控量设置" :visible.sync="dialogVisible" :before-close="onClose" width="70%">
      <el-form ref="dialogDataForm" :model="form" :rules="rules" :inline="true" label-width="100px">
        <div v-for="(item, index) in configs" :key="item.id">
          <el-row
            ><h3 style="font-size: 18px; margin-top: 0">{{ index + 1 }}、{{ item.title }}</h3></el-row
          >
          <p v-for="child in item.list" :key="child.field" style="display: inline-block; margin: 0">
            <el-form-item :label="child.label" :prop="child.field">
              <el-input
                v-if="['控量系数', '控量临界值', '长尾计算'].includes(child.label)"
                v-model="form[child.field]"
                size="small"
                type="text"
                @input="onInputValue($event, child.field, child.label)"
              >
                <span v-if="child.label === '长尾计算'" slot="suffix">天</span>
              </el-input>
              <el-select
                v-else-if="child.label === '控量开关'"
                v-model="form[child.field]"
                size="small"
                @change="
                  (a, b) => {
                    onChangeSwitch($event, index)
                  }
                "
              >
                <el-option v-for="(node, i) in optDeductSwitch" :key="i" :label="node.label" :value="node.value" />
              </el-select>
            </el-form-item>
          </p>
        </div>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="onClose">取消</el-button>
        <el-button :loading="isLoading" type="primary" @click="onSubmit">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { limitInputNumber } from '@/utils'
import { apiAddOrUpdateDeduction } from '@/api/api_extend'

export default {
  props: {
    optDeductSwitch: {
      type: Array,
      default: () => []
    },
    dialogVisible: Boolean,
    rowData: {
      type: Object,
      default: () => ({})
    },
    spreadType: {
      type: Number,
      default: NaN
    }
  },
  data() {
    return {
      form: {},
      rules: {},
      configs: {},
      isLoading: false
    }
  },
  watch: {
    dialogVisible(val) {
      if (val) {
        this.handleInit()
      }
    }
  },
  methods: {
    handleInit() {
      this.configs = this.handleGetConfigs(this.spreadType)
      this.form = this.handleInitData(this.rowData, this.configs)
      this.rules = this.handleGetFormRules(this.configs, this.form)
    },
    handleGetConfigs(spreadType) {
      let result = []
      const ob = {
        switch: { label: '控量开关', type: 'DeductSwitch' },
        number: { label: '控量系数', type: 'DeductRate' },
        value: { label: '控量临界值', type: 'DeductTempPoint' },
        calculate: { label: '长尾计算', type: 'LongTailCal', unit: '天' }
      }
      if (spreadType === 3) {
        // 半流程
        result.push({
          title: '借款金额',
          prefix: 'borrowAmount',
          list: Object.values(ob).map(item => ({ ...item, field: 'borrowAmount' + item.type }))
        })
      } else if ([1, 4].includes(spreadType)) {
        // 导流、泛舟
        result = [
          {
            title: '注册人数',
            prefix: 'register',
            list: Object.values(ob)
              .filter(item => item.label !== '长尾计算')
              .map(item => ({ ...item, field: 'register' + item.type }))
          },
          {
            title: '授信人数（一推授信）',
            prefix: 'credit',
            list: Object.values(ob).map(item => ({ ...item, field: 'credit' + item.type }))
          },
          {
            title: '借款人数',
            prefix: 'borrow',
            list: Object.values(ob).map(item => ({ ...item, field: 'borrow' + item.type }))
          }
        ]
      }
      return result
    },
    handleInitData(data = {}, configs) {
      const result = { ...data }
      if (Object.keys(result).length === 1) {
        configs.forEach(item => {
          item.list.reduce((data, cur) => {
            if (cur.field.endsWith('DeductSwitch')) {
              data[cur.field] = 0
            } else {
              data[cur.field] = ''
            }
            return data
          }, result)
        })
      }
      return result
    },
    handleGetFormRules(configs, formData) {
      const result = {}
      configs.forEach(item => {
        let required = true
        const ob = item.list.find(child => child.field.endsWith('DeductSwitch'))
        if (ob) {
          required = !!formData[ob.field]
        }
        item.list.reduce((data, cur) => {
          data[cur.field] = [{ required, message: `请输入${cur.label}`, trigger: 'change' }]
          return data
        }, result)
      })
      return result
    },
    onInputValue(val, field, label) {
      if (['长尾计算', '控量临界值'].includes(label)) {
        this.handleLongTailCal(val, field)
      } else {
        this.handleDeductRate(val, field)
      }
    },
    // 控量系数
    handleDeductRate(val, field) {
      this.form[field] = limitInputNumber(val, 1, 0, 2)
    },
    // 长尾计算/控量临界点
    handleLongTailCal(val, field) {
      const v = limitInputNumber(val, null, 0)
      this.form[field] = (v && String(v).replace(/^0(\d+)/, '$1')) || ''
    },
    onChangeSwitch(val, index) {
      this.configs[index].list
        .map(item => item.field)
        .forEach(key => {
          this.rules[key][0].required = !!val
        })
    },
    onClose() {
      this.$emit('update:dialogVisible', false)
    },
    onSubmit() {
      this.$refs.dialogDataForm.validate(valid => {
        if (valid) {
          this.isLoading = true
          apiAddOrUpdateDeduction({ ...this.form })
            .then(res => {
              this.isLoading = false
              if (res.code === 200) {
                this.$message.success('操作成功')
                this.$emit('handleSearch')
                this.$emit('update:dialogVisible', false)
              } else {
                this.$message.error(res.msg)
              }
            })
            .catch(e => {
              this.canClick = true
            })
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
::v-deep(.el-descriptions__header) {
  justify-content: flex-start;
}
</style>
