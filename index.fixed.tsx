import { useEffect, useMemo, useState } from 'react'
import { createForm } from '@formily/core'
import { Button, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAsyncEffect } from 'ahooks'
import {
  FormPage,
  formStyleTransitionPx,
  SchemaField,
  schemaTransitionPx,
} from 'snify/es/components'
import { RuntimeProvider } from 'snify/es/components/RuntimeProvider'
import { MiniProgramPageContract } from 'v8-contract'

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

  // 创建表单实例 - 只在 designableJson 存在时创建
  const form = useMemo(() => {
    if (!designableJson?.form) {
      return null
    }
    return createForm({
      initialValues: designableJson.form?.initialValues || {},
    })
  }, [designableJson])

  // H5 环境下的消息监听
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

  // 小程序环境下的数据加载
  useAsyncEffect(async () => {
    try {
      const data = await MiniProgramPageContract.findPage({
        page_id: 'e10238e15b34e1a7ea',
      })

      console.log('findPage data:', data)

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

      console.log('formJson', formJson)
      console.log('eventJson', eventJsonData)
      console.log('variableJson', variableJson)
      console.log('componentJson', componentJson)

      // 确保数据存在后再设置
      if (formJson) {
        setdesignableJson(formJson)
        // 在小程序环境下，确保样式转换在数据设置后执行
        setTimeout(() => {
          transitionStyle(formJson)
        }, 0)
      }

      if (eventJsonData) {
        setEventJson(eventJsonData)
      }

      // 标记数据已准备好
      setIsDataReady(true)

      // 延迟执行事件管理器初始化，确保组件已渲染
      setTimeout(() => {
        // const eventManager = new EventManager(eventJsonData.present.data as any)
        // const eventManager = EventManager.getInstance()
        // eventManager.batchAddEventListener(eventJsonData.present.data as any)
      }, 1000)
    } catch (e) {
      console.error('数据加载错误:', e)
      // 如果加载失败，使用测试数据
      if (testJson) {
        setdesignableJson(testJson)
        transitionStyle(testJson)
        setIsDataReady(true)
      }
    }
  }, [])

  // 调试日志
  useEffect(() => {
    console.log('组件状态:', {
      hasDesignableJson: !!designableJson,
      hasEventJson: !!eventJson,
      isDataReady,
      hasForm: !!form,
      hasSchema: !!designableJson?.schema,
      hasEventConfig: !!eventJson?.present?.data,
    })
  }, [designableJson, eventJson, isDataReady, form])

  // 如果数据未准备好，显示加载状态
  if (!isDataReady || !designableJson || !form) {
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <View>表单加载中...</View>
      </View>
    )
  }

  // 确保 schema 存在
  if (!designableJson.schema) {
    console.warn('Schema 数据不存在，designableJson:', designableJson)
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <View>Schema 数据不存在</View>
      </View>
    )
  }

  // 确保 form 配置存在
  if (!designableJson.form) {
    console.warn('Form 配置不存在，designableJson:', designableJson)
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <View>Form 配置不存在</View>
      </View>
    )
  }

  console.log('process.env.hostname', process.env.hostname)
  console.log('准备渲染表单，designableJson:', designableJson)
  console.log('eventJson:', eventJson)

  return (
    <View style={{ margin: 0, padding: 0 }}>
      <FormPage form={form} {...designableJson.form}>
        {eventJson?.present?.data ? (
          <RuntimeProvider
            eventConfig={eventJson.present.data as any}
            store={useStore as never}
          >
            <SchemaField schema={designableJson.schema} />
          </RuntimeProvider>
        ) : (
          // 如果 eventConfig 不存在，直接渲染 SchemaField
          <SchemaField schema={designableJson.schema} />
        )}
      </FormPage>
    </View>
  )
}
