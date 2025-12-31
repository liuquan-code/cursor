import { useEffect, useMemo, useState, useRef } from 'react'
import { createForm } from '@formily/core'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAsyncEffect } from 'ahooks'
import {
  FormPage,
  formStyleTransitionPx,
  schemaTransitionPx,
} from 'snify/es/components'
import { RuntimeProvider } from 'snify/es/components/RuntimeProvider'
import { MiniProgramPageContract } from 'v8-contract'

// 使用 Formily 的底层 API 手动渲染
import { FormProvider, createSchemaField, RecursionField } from '@formily/react'
import { observer } from '@formily/react'

// 导入 Taroify 组件（根据实际使用的组件调整）
import { Input, Button as TaroButton, Checkbox, Radio, Switch, Cell, Picker, Textarea } from '@taroify/core'
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
  const formRef = useRef<any>(null)

  const form = useMemo(() => {
    if (!designableJson?.form) {
      return null
    }
    const formInstance = createForm({
      initialValues: designableJson.form?.initialValues || {},
    })
    formRef.current = formInstance
    return formInstance
  }, [designableJson])

  // 手动创建 SchemaField，注册所有可能的组件
  const SchemaField = useMemo(() => {
    try {
      return createSchemaField({
        components: {
          // Taro 基础组件
          View,
          Text,
          Button,
          // Taroify 组件 - 根据你的 schema 中实际使用的组件添加
          Input,
          Button: TaroButton,
          Checkbox,
          Radio,
          Switch,
          Cell,
          Picker,
          Textarea,
          // 如果 schema 中使用了其他组件，在这里添加
        },
        // 可能需要的其他配置
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
            const data = JSON.parse(event.data.data)
            setdesignableJson(data)
            transitionStyle(data)
            setIsDataReady(true)
            window.removeEventListener('message', fn)
          }
        }
        window.addEventListener('message', fn, false)
        window.opener.postMessage({ type: 'getSchema' }, '*')
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
      } = data.data.data

      const formJson = decompressData(page_component)
      const eventJsonData = decompressData(page_event_config)

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

  // 监听表单状态变化
  useEffect(() => {
    if (form) {
      const dispose = form.subscribe((formState) => {
        console.log('表单状态变化:', {
          values: formState.values,
          errors: formState.errors,
        })
      })
      return dispose
    }
  }, [form])

  // 检查 schema 结构并输出调试信息
  useEffect(() => {
    if (designableJson?.schema) {
      console.log('=== Schema 结构分析 ===')
      const schema = designableJson.schema
      
      // 递归查找所有组件
      const findComponents = (obj: any, components: Set<string>, depth = 0): void => {
        if (depth > 10) return // 防止无限递归
        if (typeof obj !== 'object' || obj === null) return
        
        if (obj['x-component']) {
          components.add(obj['x-component'])
        }
        
        Object.values(obj).forEach(value => {
          if (Array.isArray(value)) {
            value.forEach(item => findComponents(item, components, depth + 1))
          } else if (typeof value === 'object') {
            findComponents(value, components, depth + 1)
          }
        })
      }
      
      const components = new Set<string>()
      findComponents(schema, components)
      console.log('Schema 中使用的组件:', Array.from(components))
      
      // 检查是否有未注册的组件
      const registeredComponents = ['View', 'Text', 'Button', 'Input', 'Checkbox', 'Radio', 'Switch', 'Cell', 'Picker', 'Textarea']
      const missingComponents = Array.from(components).filter(c => !registeredComponents.includes(c))
      if (missingComponents.length > 0) {
        console.warn('⚠️ 未注册的组件:', missingComponents)
      }
    }
  }, [designableJson])

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

  if (!SchemaField) {
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <Text style={{ color: 'red' }}>SchemaField 创建失败</Text>
      </View>
    )
  }

  console.log('准备渲染表单')

  // 方案 1: 使用 FormProvider + SchemaField（推荐）
  return (
    <View style={{ 
      margin: 0, 
      padding: 0, 
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#fff',
    }}>
      <FormProvider form={form}>
        {eventJson?.present?.data ? (
          <RuntimeProvider
            eventConfig={eventJson.present.data as any}
            store={useStore as never}
          >
            <SchemaField schema={designableJson.schema} />
          </RuntimeProvider>
        ) : (
          <SchemaField schema={designableJson.schema} />
        )}
      </FormProvider>
    </View>
  )

  // 如果方案 1 不行，尝试方案 2: 使用 FormPage
  /*
  return (
    <View style={{ margin: 0, padding: 0, minHeight: '100vh', width: '100%' }}>
      <FormPage form={form} {...designableJson.form}>
        {eventJson?.present?.data ? (
          <RuntimeProvider
            eventConfig={eventJson.present.data as any}
            store={useStore as never}
          >
            <SchemaField schema={designableJson.schema} />
          </RuntimeProvider>
        ) : (
          <SchemaField schema={designableJson.schema} />
        )}
      </FormPage>
    </View>
  )
  */

  // 如果方案 2 也不行，尝试方案 3: 使用 RecursionField 手动渲染
  /*
  return (
    <View style={{ margin: 0, padding: 0, minHeight: '100vh', width: '100%' }}>
      <FormProvider form={form}>
        <RecursionField schema={designableJson.schema} />
      </FormProvider>
    </View>
  )
  */
}
