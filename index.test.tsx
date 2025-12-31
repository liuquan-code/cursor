import { useEffect, useMemo, useState } from 'react'
import { createForm } from '@formily/core'
import { View, Text } from '@tarojs/components'
import { useAsyncEffect } from 'ahooks'
import { MiniProgramPageContract } from 'v8-contract'

import { decompressData } from '@/utils'
import useStore from '../../../store/store'

import testJson from './input.json'

/**
 * 最简化的测试版本
 * 用于定位问题：逐步添加组件，看哪一步出现问题
 */
export default () => {
  const [designableJson, setdesignableJson] = useState<any>(null)
  const [eventJson, setEventJson] = useState<any>(null)
  const [isDataReady, setIsDataReady] = useState(false)

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
      }
      if (eventJsonData) {
        setEventJson(eventJsonData)
      }

      setIsDataReady(true)
    } catch (e) {
      console.error('数据加载错误:', e)
      if (testJson) {
        setdesignableJson(testJson)
        setIsDataReady(true)
      }
    }
  }, [])

  // 测试步骤 1：只显示文本
  if (!isDataReady) {
    return (
      <View style={{ padding: '20px' }}>
        <Text>加载中...</Text>
      </View>
    )
  }

  // 测试步骤 2：显示数据信息
  return (
    <View style={{ 
      padding: '20px', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <View style={{ 
        backgroundColor: '#fff', 
        padding: '15px', 
        marginBottom: '10px',
        borderRadius: '8px'
      }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
          测试步骤 1: 基础渲染
        </Text>
        <Text style={{ display: 'block', marginBottom: '5px' }}>
          数据已加载: {isDataReady ? '✓' : '✗'}
        </Text>
        <Text style={{ display: 'block', marginBottom: '5px' }}>
          有 designableJson: {designableJson ? '✓' : '✗'}
        </Text>
        <Text style={{ display: 'block', marginBottom: '5px' }}>
          有 schema: {designableJson?.schema ? '✓' : '✗'}
        </Text>
        <Text style={{ display: 'block', marginBottom: '5px' }}>
          有 eventJson: {eventJson ? '✓' : '✗'}
        </Text>
      </View>

      {/* 测试步骤 3：显示 schema 信息 */}
      {designableJson?.schema && (
        <View style={{ 
          backgroundColor: '#fff', 
          padding: '15px', 
          marginBottom: '10px',
          borderRadius: '8px'
        }}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
            测试步骤 2: Schema 信息
          </Text>
          <Text style={{ display: 'block', marginBottom: '5px', fontSize: '12px', wordBreak: 'break-all' }}>
            Schema 类型: {typeof designableJson.schema}
          </Text>
          <Text style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
            Schema Keys: {designableJson.schema && typeof designableJson.schema === 'object' 
              ? Object.keys(designableJson.schema).join(', ') 
              : 'N/A'}
          </Text>
          <Text style={{ display: 'block', fontSize: '12px', color: '#666' }}>
            Schema 预览: {JSON.stringify(designableJson.schema).substring(0, 200)}...
          </Text>
        </View>
      )}

      {/* 测试步骤 4：尝试导入并渲染 FormPage */}
      <View style={{ 
        backgroundColor: '#fff', 
        padding: '15px', 
        marginBottom: '10px',
        borderRadius: '8px'
      }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
          测试步骤 3: 组件导入测试
        </Text>
        <Text style={{ display: 'block', marginBottom: '5px' }}>
          请检查控制台，查看以下组件是否正确导入：
        </Text>
        <Text style={{ display: 'block', fontSize: '12px', color: '#666' }}>
          - FormPage
        </Text>
        <Text style={{ display: 'block', fontSize: '12px', color: '#666' }}>
          - SchemaField
        </Text>
        <Text style={{ display: 'block', fontSize: '12px', color: '#666' }}>
          - RuntimeProvider
        </Text>
      </View>

      {/* 在这里添加你的实际组件进行测试 */}
      {/* 
      取消注释下面的代码，逐步测试：
      
      // 测试 1: 只渲染 FormPage
      import { FormPage } from 'snify/es/components'
      const form = createForm({ initialValues: designableJson.form?.initialValues || {} })
      return (
        <View>
          <FormPage form={form} {...designableJson.form}>
            <Text>FormPage 内部</Text>
          </FormPage>
        </View>
      )

      // 测试 2: 添加 SchemaField
      import { SchemaField } from 'snify/es/components'
      return (
        <View>
          <FormPage form={form} {...designableJson.form}>
            <SchemaField schema={designableJson.schema} />
          </FormPage>
        </View>
      )

      // 测试 3: 添加 RuntimeProvider
      import { RuntimeProvider } from 'snify/es/components/RuntimeProvider'
      return (
        <View>
          <FormPage form={form} {...designableJson.form}>
            <RuntimeProvider eventConfig={eventJson?.present?.data} store={useStore}>
              <SchemaField schema={designableJson.schema} />
            </RuntimeProvider>
          </FormPage>
        </View>
      )
      */}
    </View>
  )
}
