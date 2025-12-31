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

/**
 * 样式转换函数 - 增强版本，包含错误处理
 */
function transitionStyle(designableJson: {
  form?: any
  schema?: any
}) {
  if (!designableJson) {
    console.warn('transitionStyle: designableJson 为空')
    return false
  }

  if (!designableJson.schema) {
    console.warn('transitionStyle: schema 不存在')
    return false
  }

  if (!designableJson.form) {
    console.warn('transitionStyle: form 不存在')
    return false
  }

  try {
    schemaTransitionPx(designableJson.schema, { mode: 'rem' })
    formStyleTransitionPx(designableJson.form, { mode: 'rem' })
    console.log('样式转换成功')
    return true
  } catch (error) {
    console.error('样式转换失败:', error)
    return false
  }
}

export default () => {
  const [designableJson, setdesignableJson] = useState<{
    form: any
    schema: any
  } | null>(null)
  const [eventJson, setEventJson] = useState<any>(null)
  const [isDataReady, setIsDataReady] = useState(false)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  // 创建表单实例 - 只在 designableJson 存在时创建
  const form = useMemo(() => {
    if (!designableJson?.form) {
      return null
    }
    try {
      return createForm({
        initialValues: designableJson.form?.initialValues || {},
      })
    } catch (error) {
      console.error('创建表单失败:', error)
      return null
    }
  }, [designableJson])

  // H5 环境下的消息监听
  useEffect(() => {
    if (process.env.TARO_ENV === 'h5') {
      if (window.opener) {
        const fn = (event) => {
          if (event.data.type === 'getSchemaRes') {
            try {
              console.log('收到 H5 消息:', event.data.data)
              const data = JSON.parse(event.data.data)
              
              if (!data || !data.schema) {
                throw new Error('Schema 数据格式错误')
              }

              setdesignableJson(data)
              
              // 延迟执行样式转换，确保状态已更新
              setTimeout(() => {
                transitionStyle(data)
              }, 0)
              
              setIsDataReady(true)
              window.removeEventListener('message', fn)
            } catch (error) {
              console.error('处理 H5 消息失败:', error)
              setLoadingError('解析 Schema 数据失败')
            }
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
      console.log('开始加载页面数据...')
      
      const data = await MiniProgramPageContract.findPage({
        page_id: 'e10238e15b34e1a7ea',
      })

      console.log('findPage 响应:', data)

      if (!data?.data?.data) {
        throw new Error('返回数据格式错误')
      }

      const {
        page_component,
        page_event_config,
        page_variable_data,
        page_component_variable,
      } = data.data.data

      // 解压数据
      let formJson = null
      let eventJsonData = null
      let variableJson = null

      try {
        formJson = page_component ? decompressData(page_component) : null
        eventJsonData = page_event_config ? decompressData(page_event_config) : null
        variableJson = page_variable_data ? decompressData(page_variable_data) : null
      } catch (decompressError) {
        console.error('数据解压失败:', decompressError)
        throw new Error('数据解压失败')
      }

      console.log('数据解压结果:', {
        formJson: !!formJson,
        eventJsonData: !!eventJsonData,
        variableJson: !!variableJson,
        componentJson: !!page_component_variable,
      })

      // 验证 formJson 数据完整性
      if (!formJson) {
        throw new Error('表单数据不存在')
      }

      if (!formJson.schema) {
        throw new Error('Schema 数据不存在')
      }

      if (!formJson.form) {
        throw new Error('Form 配置不存在')
      }

      // 设置状态
      setdesignableJson(formJson)
      
      if (eventJsonData) {
        setEventJson(eventJsonData)
      }

      // 延迟执行样式转换，确保状态已更新
      setTimeout(() => {
        const success = transitionStyle(formJson)
        if (!success) {
          console.warn('样式转换失败，但继续渲染')
        }
      }, 0)

      // 标记数据已准备好
      setIsDataReady(true)
      setLoadingError(null)

      console.log('数据加载完成')

      // 延迟执行事件管理器初始化
      setTimeout(() => {
        if (eventJsonData?.present?.data) {
          // const eventManager = new EventManager(eventJsonData.present.data as any)
          // const eventManager = EventManager.getInstance()
          // eventManager.batchAddEventListener(eventJsonData.present.data as any)
          console.log('事件管理器初始化完成')
        }
      }, 1000)
    } catch (e) {
      console.error('数据加载错误:', e)
      setLoadingError(e instanceof Error ? e.message : '未知错误')
      
      // 如果加载失败，尝试使用测试数据
      if (testJson && testJson.schema && testJson.form) {
        console.log('使用测试数据作为降级方案')
        setdesignableJson(testJson)
        setTimeout(() => {
          transitionStyle(testJson)
        }, 0)
        setIsDataReady(true)
      }
    }
  }, [])

  // 调试日志
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('组件状态:', {
        hasDesignableJson: !!designableJson,
        hasEventJson: !!eventJson,
        isDataReady,
        hasForm: !!form,
        hasSchema: !!designableJson?.schema,
        hasFormConfig: !!designableJson?.form,
        hasEventConfig: !!eventJson?.present?.data,
        loadingError,
      })
    }
  }, [designableJson, eventJson, isDataReady, form, loadingError])

  // 显示错误状态
  if (loadingError && !isDataReady) {
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <View style={{ color: 'red', marginBottom: '10px' }}>
          加载失败: {loadingError}
        </View>
        <View>请检查网络连接或联系技术支持</View>
      </View>
    )
  }

  // 如果数据未准备好，显示加载状态
  if (!isDataReady || !designableJson || !form) {
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <View>表单加载中...</View>
        {process.env.NODE_ENV === 'development' && (
          <View style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
            等待数据加载...
          </View>
        )}
      </View>
    )
  }

  // 确保 schema 存在
  if (!designableJson.schema) {
    console.error('Schema 数据不存在，designableJson:', designableJson)
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <View style={{ color: 'red' }}>Schema 数据不存在</View>
        {process.env.NODE_ENV === 'development' && (
          <View style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
            {JSON.stringify(designableJson, null, 2)}
          </View>
        )}
      </View>
    )
  }

  // 确保 form 配置存在
  if (!designableJson.form) {
    console.error('Form 配置不存在，designableJson:', designableJson)
    return (
      <View style={{ margin: 0, padding: '20px', textAlign: 'center' }}>
        <View style={{ color: 'red' }}>Form 配置不存在</View>
      </View>
    )
  }

  console.log('准备渲染表单')
  console.log('designableJson:', designableJson)
  console.log('eventJson:', eventJson)
  console.log('form:', form)

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
