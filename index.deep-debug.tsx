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

// 尝试直接使用 Formily 的底层 API
import { FormProvider, Field, useField, observer } from '@formily/react'
import { createSchemaField } from '@formily/react'

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
  const [renderError, setRenderError] = useState<any>(null)

  const form = useMemo(() => {
    if (!designableJson?.form) {
      return null
    }
    return createForm({
      initialValues: designableJson.form?.initialValues || {},
    })
  }, [designableJson])

  // 手动创建 SchemaField，确保注册了所有组件
  const CustomSchemaField = useMemo(() => {
    try {
      return createSchemaField({
        components: {
          View,
          Text,
          Button,
          // 添加更多组件
        },
      })
    } catch (error) {
      console.error('创建 CustomSchemaField 失败:', error)
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

  // 深度分析 schema 结构
  useEffect(() => {
    if (designableJson?.schema) {
      console.log('=== Schema 深度分析 ===')
      const schema = designableJson.schema
      
      // 检查 schema 类型
      console.log('Schema 类型:', typeof schema)
      console.log('是否为对象:', typeof schema === 'object')
      console.log('是否为数组:', Array.isArray(schema))
      
      // 检查 schema 结构
      if (typeof schema === 'object' && schema !== null) {
        console.log('Schema keys:', Object.keys(schema))
        console.log('Schema 完整内容:', JSON.stringify(schema, null, 2))
        
        // 检查是否有 properties
        if (schema.properties) {
          console.log('Properties keys:', Object.keys(schema.properties))
          console.log('Properties 数量:', Object.keys(schema.properties).length)
          
          // 检查第一个 property
          const firstKey = Object.keys(schema.properties)[0]
          if (firstKey) {
            console.log('第一个 property:', firstKey, schema.properties[firstKey])
          }
        }
        
        // 检查是否有 items（数组类型）
        if (schema.items) {
          console.log('Items:', schema.items)
        }
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

  // 测试：尝试直接渲染 schema 中的字段（不使用 SchemaField）
  const renderSchemaDirectly = () => {
    try {
      const schema = designableJson.schema
      
      // 如果 schema 有 properties，尝试渲染
      if (schema.properties && typeof schema.properties === 'object') {
        return Object.keys(schema.properties).map((key, index) => {
          const fieldSchema = schema.properties[key]
          const component = fieldSchema['x-component'] || 'Input'
          
          return (
            <View key={key} style={{ 
              padding: '10px', 
              marginBottom: '10px',
              backgroundColor: '#fff',
              border: '1px solid #ddd'
            }}>
              <Text style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                {fieldSchema.title || key}
              </Text>
              <Text style={{ fontSize: '12px', color: '#666' }}>
                组件类型: {component}
              </Text>
              <Text style={{ fontSize: '12px', color: '#666' }}>
                Schema: {JSON.stringify(fieldSchema).substring(0, 100)}
              </Text>
            </View>
          )
        })
      }
      
      return (
        <View style={{ padding: '10px' }}>
          <Text>Schema 结构不符合预期</Text>
          <Text style={{ fontSize: '12px' }}>
            {JSON.stringify(schema, null, 2).substring(0, 500)}
          </Text>
        </View>
      )
    } catch (error) {
      console.error('直接渲染 schema 失败:', error)
      return (
        <View style={{ padding: '10px' }}>
          <Text style={{ color: 'red' }}>渲染错误: {error.message}</Text>
        </View>
      )
    }
  }

  console.log('准备渲染，尝试多种方式')

  return (
    <View style={{ 
      margin: 0, 
      padding: 0, 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      {/* 调试信息面板 */}
      <View style={{ 
        padding: '15px', 
        backgroundColor: '#fff',
        marginBottom: '10px',
        borderBottom: '2px solid #1890ff'
      }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
          深度调试模式
        </Text>
        <Text style={{ display: 'block', marginBottom: '5px' }}>
          Schema 类型: {typeof designableJson.schema}
        </Text>
        <Text style={{ display: 'block', marginBottom: '5px' }}>
          Schema 是否为对象: {typeof designableJson.schema === 'object' ? '是' : '否'}
        </Text>
        {designableJson.schema && typeof designableJson.schema === 'object' && (
          <>
            <Text style={{ display: 'block', marginBottom: '5px' }}>
              Schema Keys: {Object.keys(designableJson.schema).join(', ')}
            </Text>
            {designableJson.schema.properties && (
              <Text style={{ display: 'block', marginBottom: '5px' }}>
                Properties 数量: {Object.keys(designableJson.schema.properties).length}
              </Text>
            )}
          </>
        )}
      </View>

      {/* 测试 1: 直接渲染 schema 字段（不使用 SchemaField） */}
      <View style={{ 
        padding: '15px', 
        backgroundColor: '#fff',
        marginBottom: '10px'
      }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
          测试 1: 直接渲染 Schema 字段
        </Text>
        {renderSchemaDirectly()}
      </View>

      {/* 测试 2: 使用 FormProvider + Field 手动渲染 */}
      <View style={{ 
        padding: '15px', 
        backgroundColor: '#fff',
        marginBottom: '10px'
      }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
          测试 2: 使用 FormProvider + Field
        </Text>
        <FormProvider form={form}>
          {designableJson.schema?.properties && Object.keys(designableJson.schema.properties).slice(0, 1).map((key) => {
            const fieldSchema = designableJson.schema.properties[key]
            return (
              <Field
                key={key}
                name={key}
                title={fieldSchema.title}
                component={[fieldSchema['x-component'] || 'Input']}
              />
            )
          })}
        </FormProvider>
      </View>

      {/* 测试 3: 使用 CustomSchemaField */}
      {CustomSchemaField && (
        <View style={{ 
          padding: '15px', 
          backgroundColor: '#fff',
          marginBottom: '10px'
        }}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
            测试 3: 使用 CustomSchemaField
          </Text>
          <FormProvider form={form}>
            <CustomSchemaField schema={designableJson.schema} />
          </FormProvider>
        </View>
      )}

      {/* 测试 4: 使用 snify 的 SchemaField */}
      <View style={{ 
        padding: '15px', 
        backgroundColor: '#fff',
        marginBottom: '10px'
      }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
          测试 4: 使用 snify 的 SchemaField（原始方式）
        </Text>
        <FormPage form={form} {...designableJson.form}>
          {eventJson?.present?.data ? (
            <RuntimeProvider
              eventConfig={eventJson.present.data as any}
              store={useStore as never}
            >
              <View style={{ padding: '10px', backgroundColor: '#e8f5e9' }}>
                <Text>RuntimeProvider 内部</Text>
              </View>
              <SchemaField schema={designableJson.schema} />
            </RuntimeProvider>
          ) : (
            <>
              <View style={{ padding: '10px', backgroundColor: '#fff3e0' }}>
                <Text>不使用 RuntimeProvider</Text>
              </View>
              <SchemaField schema={designableJson.schema} />
            </>
          )}
        </FormPage>
      </View>

      {/* 错误显示 */}
      {renderError && (
        <View style={{ 
          padding: '15px', 
          backgroundColor: '#ffebee',
          marginTop: '10px'
        }}>
          <Text style={{ color: 'red', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
            渲染错误:
          </Text>
          <Text style={{ fontSize: '12px', color: '#c62828' }}>
            {renderError.toString()}
          </Text>
        </View>
      )}
    </View>
  )
}
