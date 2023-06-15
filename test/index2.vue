<!-- 催收排班，本来要用query type区分，但是标签要是加上query，那每一个详情都会生成新的标签 -->
<template>
  <div class="bg-white p-5">
    <el-tag
      v-if="user.userVO.centerName && route.query.type === 'collection'"
      size="large"
      type="warning"
      class="mx-5 text-sm"
    >
      当前催收中心：{{ user.userVO.centerName }}</el-tag
    >
    <el-calendar v-model="curDate" ref="refCalendar">
      <template #header>
        <div class="flex justify-between w-full">
          <div class="flex space-x-4">
            <el-select v-model="chooseDateVal" @change="handleChangeData">
              <el-option
                v-for="(item, index) in dateOpts"
                :key="index"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-button @click="onSelectDate('prev-month')">上个月</el-button>
            <el-button @click="onSelectDate('today')">今天</el-button>
            <el-button @click="onSelectDate('next-month')">下个月</el-button>
          </div>
          <div class="flex space-x-4">
            <!-- testzc 按钮权限 -->
            <el-upload
              v-perm="['schedule-import']"
              :http-request="onUploadFile"
              accept=".xlsx,.xls"
              :show-file-list="false"
              action="#"
            >
              <el-button type="primary">导入排班</el-button>
            </el-upload>
            <!-- testzc 按钮权限 -->
            <el-button
              v-perm="['schedule-export']"
              @click="onExport"
              type="primary"
              >导出排班</el-button
            >
          </div>
        </div>
      </template>
      <template #date-cell="{ data }">
        <div class="w-full h-full p-2" @click="onAddOrEditClick(data.date)">
          <p>{{ data.day.split('-')[2] }}</p>
          <el-tooltip placement="bottom" :content="onGetDayUserInfo(data.date)">
            <p class="truncate text-xs text-blue-600">
              {{ onGetDayUserInfo(data.date) }}
            </p>
          </el-tooltip>
        </div>
      </template>
    </el-calendar>
    <dialog-module :dialog="$dialog" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, toRefs, unref } from 'vue'
import { pageConfig } from '@/utils'
import { DialogExtraFields } from '@/components/Page/types/default'
import { formatArrData, onDownload, dateFormat } from '@/utils/common'
import { ElMessage, ElSelect } from 'element-plus'
import { useRoute } from 'vue-router'

import {
  apiScheduleList,
  apiSaveSchedule,
  apiGetSchedulePeople,
  apiSchedulExport,
  apiSchedulImport,
  apiPreScheduleList,
  apiPreSaveSchedule,
  apiGetPreSchedulePeople,
  apiPreSchedulExport,
  apiPreSchedulImport
} from '@/api/team/api_schedule'
import useStore from '@/store'

const totalApiList = {
  collection: {
    getList: apiScheduleList,
    save: apiSaveSchedule,
    getMember: apiGetSchedulePeople,
    export: apiSchedulExport,
    import: apiSchedulImport
  },
  'pre-collection': {
    getList: apiPreScheduleList,
    save: apiPreSaveSchedule,
    getMember: apiGetPreSchedulePeople,
    export: apiPreSchedulExport,
    import: apiPreSchedulImport
  }
}
const route = useRoute()
const apis = totalApiList[route.query.type as keyof typeof totalApiList]

const { user } = useStore()
const centerId = user.userVO.centerId // hack 根据route.query.type取对应的centerId，催收取催收团队，预催收取预催收中心
const refCalendar = ref()
const curDate = ref(new Date())
const chooseDateVal = ref() // 选中的日期
let pageData = ref([]) // 页面初始配置

const onSearch = (date: string) => {
  apis.getList({ scheduleTime: date, centerId: centerId }).then(res => {
    if (res.code === 200) {
      pageData.value = res.data
    }
  })
}

// 监听curData，改变了去请求接口
watch(
  () => curDate.value,
  (newVal: Date) => {
    const yearMonthStr = dateFormat(newVal, 'yyyy-MM')
    chooseDateVal.value = yearMonthStr
    onSearch(yearMonthStr)
  },
  {
    immediate: true
  }
)

// 获得日期选择下拉选项
const dateOpts = ref<{ label: string; value: string }[]>([])
;(function handelOptDateYM() {
  const nowDate = new Date()
  const curYear = nowDate.getFullYear()
  const upYear = curYear - 1
  const months = Array.from({ length: 12 }, (_, index) =>
    (index + 1).toString().padStart(2, '0')
  )
  const upYearMonthOpts = months.map(month => ({
    label: `${upYear}年${month}月`,
    value: `${upYear}-${month}`
  }))
  const curYearMonthOpts = months.map(month => ({
    label: `${curYear}年${month}月`,
    value: `${curYear}-${month}`
  }))
  dateOpts.value = [...upYearMonthOpts, ...curYearMonthOpts]
})()

// 下拉选择Date
const handleChangeData = (val: string) => {
  curDate.value = new Date(val)
}

// 上个月、今天、下个月按钮
const onSelectDate = (val: string) => {
  const cur = new Date(curDate.value)
  switch (val) {
    case 'prev-month':
      cur.setMonth(cur.getMonth() - 1)
      break
    case 'next-month':
      cur.setMonth(cur.getMonth() + 1)
      break
  }
  const newYear = cur.getFullYear()
  const curYear = new Date().getFullYear()
  const v = curYear - newYear
  if (v === 1 || v === 0) {
    refCalendar.value.selectDate(val)
  }
}

// 点击
const onAddOrEditClick = (date: Date) => {
  const { user } = useStore()

  // testzc 按钮权限
  const requiredPerms = 'schedule-add'

  const hasPerm = user.perms?.some(perm => {
    return requiredPerms.includes(perm)
  })
  if (!hasPerm) {
    return
  }
  const dateS = dateFormat(date, 'yyyyMMdd')
  const dateNow = dateFormat(new Date(), 'yyyyMMdd')
  if (parseInt(dateS) < parseInt(dateNow)) {
    // 今日之前 不能修改
    return
  }
  const item: any = onGetDataItem(date)
  let tiemStr = item?.scheduleTime ?? dateFormat(date, 'yyyy-MM-dd')
  const userIdList = item?.userList.map((userInfo: any) => {
    return userInfo.id
  })
  const dialog = unref($dialog)
  dialog.title = !item ? '新增排班' : '编辑排班'
  const editData = {
    scheduleTime: tiemStr,
    userId: userIdList ?? []
  }
  dialog.data = editData
  dialog.api = apis.save
  dialog.show = true
}
// 导出列表
const onExport = () => {
  apis
    .export({ centerId: centerId, scheduleTime: chooseDateVal.value })
    .then(res => {
      onDownload(res)
    })
    .catch(error => {
      console.log('排班导出catch：', error)
    })
}
// 上传文件
const onUploadFile = (val: any) => {
  const params = new FormData()
  params.append('centerId', centerId.toString())
  params.append('file', val.file)
  return apis.import(params).then(() => {
    ElMessage.success('操作成功')
    onSearch(chooseDateVal.value)
  })
}
// 获取对于日期 model
const onGetDataItem = (date: Date) => {
  const itemDate = dateFormat(date, 'yyyy-MM-dd')
  const list = pageData.value.filter((item: any) => {
    return item.scheduleTime === itemDate
  })
  return list.length > 0 ? list[0] : undefined
}
// 获取对应日期名称
const onGetDayUserInfo = (date: Date) => {
  const item: any = onGetDataItem(date)
  const names = item
    ? item.userList
        .reduce((acc: any, cur: any) => {
          return acc + cur.name + ','
        }, '')
        .slice(0, -1)
    : ''
  return names
}
// 弹窗  确认提交
const onDialogSubmit = (value: any, dialog: DialogExtraFields) => {
  const para = { ...value, centerId }
  return $dialog.value.api?.(para).then(() => {
    dialog.show = false
    ElMessage({ type: 'success', message: '操作成功!' })
    onSearch(chooseDateVal.value)
  })
}

/** 初始化搜索、Table */
const config = pageConfig({
  dialog: {
    scheduleTime: {
      label: '休息日期',
      // rule: true,
      type: 'date',
      format: 'yyyy-MM-dd',
      'value-format': 'yyyy-MM-dd',
      disabled: true
    },
    userId: {
      label: '休息人员',
      filterable: true,
      el: 'select',
      multiple: true,
      'collapse-tags-tooltip': true,
      'collapse-tags': true
    }
  }
})
const configs = reactive(config)
const { $dialog } = toRefs(configs)
$dialog.value.submit = onDialogSubmit

// 获取 当前催收中心 用户
;(() => {
  apis.getMember({ centerId: centerId }).then(res => {
    if (res.code === 200) {
      $dialog.value.config.userId.options = formatArrData(
        res.data,
        'name',
        'id'
      )
    }
  })
})()
</script>
