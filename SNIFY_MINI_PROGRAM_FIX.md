# Snify + Formily 小程序显示问题解决方案

## 问题分析

你的代码使用了 `snify/es/components` 中的组件，在小程序中不显示的主要原因：

### 1. **数据加载时机问题** ⭐⭐⭐⭐⭐
- `useAsyncEffect` 是异步的，组件可能在数据加载完成前就渲染了
- `eventJson?.present?.data` 和 `designableJson.schema` 可能为 `undefined`
- 小程序环境下数据加载可能比 H5 慢

### 2. **样式转换时机问题** ⭐⭐⭐⭐
- `transitionStyle(designableJson)` 在数据加载前就执行了
- 如果 `designableJson` 为空或未完全加载，转换会失败

### 3. **条件渲染缺失** ⭐⭐⭐⭐
- 没有检查数据是否加载完成就直接渲染
- 小程序环境下对空数据的处理更严格

## 解决方案

### 方案 1：添加数据加载状态检查（推荐）

```tsx
export default () => {
  const [designableJson, setdesignableJson] = useState<{
    form: any
    schema: any
  } | null>(null) // 改为 null，明确表示未加载
  const [eventJson, setEventJson] = useState<any>(null)
  const [isDataReady, setIsDataReady] = useState(false) // 添加加载状态

  const form = useMemo(() => {
    // 只在 designableJson 存在时创建表单
    if (!designableJson?.form) {
      return null
    }
    return createForm({
      initialValues: designableJson.form?.initialValues || {},
    })
  }, [designableJson])

  useAsyncEffect(async () => {
    try {
      const data = await MiniProgramPageContract.findPage({
        page_id: 'e10238e15b34e1a7ea',
      })

      const {
        page_component,
        page_event_config,
        // ...
      } = data.data.data

      const formJson = decompressData(page_component)
      const eventJsonData = decompressData(page_event_config)

      if (formJson) {
        setdesignableJson(formJson)
        // 确保在数据设置后再转换样式
        setTimeout(() => {
          transitionStyle(formJson)
        }, 0)
      }

      if (eventJsonData) {
        setEventJson(eventJsonData)
      }

      // 标记数据已准备好
      setIsDataReady(true)
    } catch (e) {
      console.error('数据加载错误:', e)
      // 错误处理：使用测试数据
      if (testJson) {
        setdesignableJson(testJson)
        transitionStyle(testJson)
        setIsDataReady(true)
      }
    }
  }, [])

  // 数据未准备好时显示加载状态
  if (!isDataReady || !designableJson || !form) {
    return (
      <View style={{ padding: '20px', textAlign: 'center' }}>
        <View>表单加载中...</View>
      </View>
    )
  }

  // 确保 schema 存在
  if (!designableJson.schema) {
    return (
      <View style={{ padding: '20px', textAlign: 'center' }}>
        <View>Schema 数据不存在</View>
      </View>
    )
  }

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
```

### 方案 2：修复 transitionStyle 函数

```tsx
function transitionStyle(designableJson) {
  // 添加数据存在性检查
  if (!designableJson?.schema || !designableJson?.form) {
    console.warn('transitionStyle: designableJson 数据不完整', designableJson)
    return
  }
  
  try {
    schemaTransitionPx(designableJson.schema, { mode: 'rem' })
    formStyleTransitionPx(designableJson.form, { mode: 'rem' })
  } catch (error) {
    console.error('样式转换失败:', error)
  }
}
```

### 方案 3：使用 useEffect 确保数据加载完成

```tsx
export default () => {
  const [designableJson, setdesignableJson] = useState(testJson) // 使用测试数据作为初始值
  const [eventJson, setEventJson] = useState<any>({})
  const [mounted, setMounted] = useState(false)

  const form = useMemo(
    () =>
      createForm({
        initialValues: designableJson?.form?.initialValues || {},
      }),
    [designableJson]
  )

  // 小程序环境下延迟挂载
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 数据加载完成后执行样式转换
  useEffect(() => {
    if (designableJson && mounted) {
      transitionStyle(designableJson)
    }
  }, [designableJson, mounted])

  useAsyncEffect(async () => {
    try {
      const data = await MiniProgramPageContract.findPage({
        page_id: 'e10238e15b34e1a7ea',
      })

      const {
        page_component,
        page_event_config,
        // ...
      } = data.data.data

      const formJson = decompressData(page_component)
      const eventJsonData = decompressData(page_event_config)

      if (formJson) {
        setdesignableJson(formJson)
      }
      if (eventJsonData) {
        setEventJson(eventJsonData)
      }
    } catch (e) {
      console.error('数据加载错误:', e)
    }
  }, [])

  // 确保组件已挂载且数据存在
  if (!mounted || !designableJson?.schema) {
    return (
      <View style={{ padding: '20px', textAlign: 'center' }}>
        <View>加载中...</View>
      </View>
    )
  }

  return (
    <View style={{ margin: 0, padding: 0 }}>
      <FormPage form={form} {...designableJson.form}>
        <RuntimeProvider
          eventConfig={eventJson?.present?.data as any}
          store={useStore as never}
        >
          <SchemaField schema={designableJson.schema} />
        </RuntimeProvider>
      </FormPage>
    </View>
  )
}
```

## 关键修复点总结

### ✅ 必须修复的点：

1. **添加数据加载状态检查**
   ```tsx
   const [isDataReady, setIsDataReady] = useState(false)
   ```

2. **条件渲染保护**
   ```tsx
   if (!isDataReady || !designableJson || !form) {
     return <View>加载中...</View>
   }
   ```

3. **修复 transitionStyle 调用时机**
   ```tsx
   // ❌ 错误：在数据加载前调用
   transitionStyle(designableJson)
   
   // ✅ 正确：在数据设置后调用
   if (formJson) {
     setdesignableJson(formJson)
     setTimeout(() => {
       transitionStyle(formJson)
     }, 0)
   }
   ```

4. **添加 schema 存在性检查**
   ```tsx
   if (!designableJson.schema) {
     return <View>Schema 数据不存在</View>
   }
   ```

5. **处理 eventConfig 可能为空的情况**
   ```tsx
   {eventJson?.present?.data ? (
     <RuntimeProvider eventConfig={eventJson.present.data}>
       <SchemaField schema={designableJson.schema} />
     </RuntimeProvider>
   ) : (
     <SchemaField schema={designableJson.schema} />
   )}
   ```

## 调试方法

### 1. 添加调试日志

```tsx
useEffect(() => {
  console.log('组件状态:', {
    hasDesignableJson: !!designableJson,
    hasEventJson: !!eventJson,
    hasForm: !!form,
    hasSchema: !!designableJson?.schema,
    hasEventConfig: !!eventJson?.present?.data,
    designableJson,
    eventJson,
  })
}, [designableJson, eventJson, form])
```

### 2. 在小程序开发者工具中检查

1. 打开小程序开发者工具
2. 查看 Console 面板的错误信息
3. 查看 Network 面板确认数据请求是否成功
4. 查看 AppData 面板检查组件状态

### 3. 检查 snify 库的兼容性

```tsx
// 检查 snify 组件是否正确导入
console.log('SchemaField:', SchemaField)
console.log('RuntimeProvider:', RuntimeProvider)
console.log('FormPage:', FormPage)
```

## 常见错误及解决

### 错误：`Cannot read property 'schema' of null`
**原因**：`designableJson` 为 `null` 时访问 `schema`
**解决**：添加存在性检查 `designableJson?.schema`

### 错误：表单不显示但无报错
**原因**：数据未加载完成就渲染
**解决**：添加 `isDataReady` 状态检查

### 错误：样式不生效
**原因**：`transitionStyle` 在数据加载前执行
**解决**：在数据设置后执行样式转换

## 完整修复代码

查看 `index.fixed.tsx` 文件获取完整的修复版本代码。
