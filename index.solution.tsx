import { useEffect, useMemo, useState } from 'react'
import { createForm } from '@formily/core'
import { Button, View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAsyncEffect } from 'ahooks'
// 尝试直接从 @formily/react 导入并手动创建 SchemaField
import { createSchemaField, FormProvider } from '@formily/react'
import {
  FormPage,
  formStyleTransitionPx,
  schemaTransitionPx,
} from 'snify/es/components'
import { RuntimeProvider } from 'snify/es/components/RuntimeProvider'
import { MiniProgramPageContract } from 'v8-contract'

// 导入 Taroify 组件（根据实际使用的组件调整）
import { Input, Button as TaroButton, Checkbox, Radio, Switch, Cell, Picker } from '@taroify/core'
import '@taroify/core/index.css'
import '@taroify/icons/index.css'

import { initFormily } from '@/utils/formily'
import { decompressData } from '@/utils'
import useStore from '../../../store/store'

import testJson from './input.json'
import './index.scss'

initFormily()

function transitionStyle(designableJson) {
  if (!designableJson?.schema || !designableJson?.form) {
    return
  }
  schemaTransitionPx(designableJson.schema, { mode: 'rem' })
  formStyleTransitionPx(designableJson.form, { mode: 'rem' })
}

export default () => {
  const [designableJson, setdesignableJson] = useState<{
    form: any
    schema: any
  } | null>(null)
  const [eventJson, setEventJson] = useState<any>(null)
  const [isDataReady, setIsDataReady] = useState(false)

  const form = useMemo(() => {
    if (!designableJson?.form) {
      return null
    }
    return createForm({
      initialValues: designableJson.form?.initialValues || {},
    })
  }, [designableJson])

  // 手动创建 SchemaField，确保注册了所有小程序组件
  const CustomSchemaField = useMemo(() => {
    try {
      return createSchemaField({
        components: {
          // Taro 基础组件
          View,
          Text,
          Button,
          // Taroify 组件
          Input,
          Button: TaroButton,
          Checkbox,
          Radio,
          Switch,
          Cell,
          Picker,
          // 如果 snify 有特殊的组件映射，也需要注册
        },
      })
    } catch (error) {
      console.error('创建 SchemaField 失败:', error)
      return null
    }
  }, [])

  useEffect(() => {
    if (process.env.TARO_ENV === 'h5') {
      if (window.opener) {
        const fn = (event) => {
          if (event.data.type === 'getSchemaRes') {
            console.log('event.data.data', event.data.data, JSON.parse(event.data.data))
            const data = JSON.parse(event.data.data)
            setdesignableJson(data)
            transitionStyle(data)
            setIsDataReady(true)
            window.removeEventListener('message', fn)
          }
        }
        window.addEventListener('message', fn, false)
        window.opener.postMessage(
          {
            type: 'getSchema',
          },
          '*'
        )
      }
    }
  }, [])

  useAsyncEffect(async () => {
    try {
      const data = await MiniProgramPageContract.findPage({
        page_id: 'e10238e15b34e1a7ea',
      })

      const {
        page_component,
        page_event_config,
        page_variable_data,
        page_component_variable,
      } = data.data.data

      const formJson = decompressData(page_component)
      const eventJsonData = decompressData(page_event_config)
      const variableJson = decompressData(page_variable_data) as any
      const componentJson = page_component_variable

      if (formJson) {
        setdesignableJson(formJson)
        setTimeout(() => {
          transitionStyle(formJson)
        }, 0)
      }

      if (eventJsonData) {
        setEventJson(eventJsonData)
      }

      setIsDataReady(true)
    } catch (e) {
      console.error('数据加载错误:', e)
      if (testJson) {
        setdesignableJson(testJson)
        transitionStyle(testJson)
        setIsDataReady(true)
      }
    }
  }, [])

  // 调试：检查组件和 schema
  useEffect(() => {
    console.log('=== 详细调试信息 ===')
    console.log('CustomSchemaField:', CustomSchemaField)
    console.log('form:', form)
    console.log('schema 内容:', designableJson?.schema)
    console.log('schema 类型:', typeof designableJson?.schema)
    console.log('schema 是否为对象:', designableJson?.schema && typeof designableJson.schema === 'object')
    
    // 检查 schema 的结构
    if (designableJson?.schema) {
      console.log('schema keys:', Object.keys(designableJson.schema))
      console.log('schema 前100个字符:', JSON.stringify(designableJson.schema).substring(0, 100))
    }
  }, [designableJson, form, CustomSchemaField])

  if (!isDataReady || !designableJson || !form) {
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <Text>表单加载中...</Text>
      </View>
    )
  }

  if (!designableJson.schema) {
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <Text style={{ color: 'red' }}>Schema 数据不存在</Text>
      </View>
    )
  }

  if (!CustomSchemaField) {
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <Text style={{ color: 'red' }}>SchemaField 创建失败</Text>
      </View>
    )
  }

  console.log('准备渲染表单，使用 CustomSchemaField')

  return (
    <View style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
      <FormPage form={form} {...designableJson.form}>
        {eventJson?.present?.data ? (
          <RuntimeProvider
            eventConfig={eventJson.present.data as any}
            store={useStore as never}
          >
            <CustomSchemaField schema={designableJson.schema} />
          </RuntimeProvider>
        ) : (
          <CustomSchemaField schema={designableJson.schema} />
        )}
      </FormPage>
    </View>
  )
}
