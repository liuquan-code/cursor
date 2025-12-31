import { useEffect, useMemo, useState } from 'react'
import { createForm } from '@formily/core'
import { Button, View, Text } from '@tarojs/components'
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
  const [renderError, setRenderError] = useState<string | null>(null)

  const form = useMemo(() => {
    if (!designableJson?.form) {
      return null
    }
    return createForm({
      initialValues: designableJson.form?.initialValues || {},
    })
  }, [designableJson])

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

  // 详细的调试日志
  useEffect(() => {
    console.log('=== 组件状态调试 ===')
    console.log('hasDesignableJson:', !!designableJson)
    console.log('hasEventJson:', !!eventJson)
    console.log('isDataReady:', isDataReady)
    console.log('hasForm:', !!form)
    console.log('hasSchema:', !!designableJson?.schema)
    console.log('hasFormConfig:', !!designableJson?.form)
    console.log('hasEventConfig:', !!eventJson?.present?.data)
    console.log('designableJson:', designableJson)
    console.log('eventJson:', eventJson)
    console.log('form:', form)
    console.log('SchemaField 组件:', SchemaField)
    console.log('RuntimeProvider 组件:', RuntimeProvider)
    console.log('FormPage 组件:', FormPage)
  }, [designableJson, eventJson, isDataReady, form])

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

  // 测试：先渲染一个简单的 View 看看是否能显示
  console.log('准备渲染表单组件')
  
  try {
    return (
      <View style={{ margin: 0, padding: 0, minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        {/* 调试信息 - 开发环境显示 */}
        {process.env.NODE_ENV === 'development' && (
          <View style={{ 
            padding: '10px', 
            backgroundColor: '#fff', 
            marginBottom: '10px',
            fontSize: '12px',
            borderBottom: '1px solid #eee'
          }}>
            <Text>调试信息：数据已加载 ✓</Text>
          </View>
        )}
        
        {/* 测试：先渲染 FormPage 看看 */}
        <View style={{ padding: '10px', backgroundColor: '#fff', marginBottom: '10px' }}>
          <Text>FormPage 开始渲染</Text>
        </View>

        <FormPage form={form} {...designableJson.form}>
          <View style={{ padding: '10px', backgroundColor: '#e8f5e9', marginBottom: '10px' }}>
            <Text>FormPage 内部 - RuntimeProvider 开始渲染</Text>
          </View>
          
          {eventJson?.present?.data ? (
            <>
              <View style={{ padding: '10px', backgroundColor: '#fff3e0', marginBottom: '10px' }}>
                <Text>RuntimeProvider 已渲染，eventConfig 存在</Text>
              </View>
              <RuntimeProvider
                eventConfig={eventJson.present.data as any}
                store={useStore as never}
              >
                <View style={{ padding: '10px', backgroundColor: '#e1f5fe', marginBottom: '10px' }}>
                  <Text>RuntimeProvider 内部 - SchemaField 开始渲染</Text>
                </View>
                <SchemaField schema={designableJson.schema} />
                <View style={{ padding: '10px', backgroundColor: '#f3e5f5', marginBottom: '10px' }}>
                  <Text>SchemaField 已渲染</Text>
                </View>
              </RuntimeProvider>
            </>
          ) : (
            <>
              <View style={{ padding: '10px', backgroundColor: '#ffebee', marginBottom: '10px' }}>
                <Text>eventConfig 不存在，直接渲染 SchemaField</Text>
              </View>
              <SchemaField schema={designableJson.schema} />
            </>
          )}
        </FormPage>

        <View style={{ padding: '10px', backgroundColor: '#fff', marginTop: '10px' }}>
          <Text>FormPage 结束</Text>
        </View>
      </View>
    )
  } catch (error) {
    console.error('渲染错误:', error)
    setRenderError(error instanceof Error ? error.message : '未知渲染错误')
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <Text style={{ color: 'red' }}>渲染错误: {renderError}</Text>
        <Text style={{ fontSize: '12px', marginTop: '10px' }}>
          {error?.toString()}
        </Text>
      </View>
    )
  }
}
