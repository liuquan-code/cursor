# Formily + Taroify 小程序显示问题 - 快速修复指南

## 🔴 最可能的原因（按优先级排序）

### 1. **组件未正确注册** ⭐⭐⭐⭐⭐
**问题**：`SchemaField` 没有注册 Taro/Taroify 组件

**快速修复**：
```tsx
import { createSchemaField } from '@formily/react';
import { View } from '@tarojs/components';
import { Input, Button } from '@taroify/core';

// ❌ 错误写法
<SchemaField schema={schema} />

// ✅ 正确写法
const SchemaField = createSchemaField({
  components: {
    View,
    Input,
    Button,
    // 注册所有 schema 中使用的组件
  },
});

<SchemaField schema={schema} />
```

### 2. **数据未加载完成就渲染** ⭐⭐⭐⭐
**问题**：`eventJson?.present?.data` 或 `designableJson?.schema` 可能为空

**快速修复**：
```tsx
// ❌ 错误写法
<RuntimeProvider eventConfig={eventJson?.present?.data}>
  <SchemaField schema={designableJson?.schema} />
</RuntimeProvider>

// ✅ 正确写法
{eventJson?.present?.data && designableJson?.schema ? (
  <RuntimeProvider eventConfig={eventJson.present.data}>
    <SchemaField schema={designableJson.schema} />
  </RuntimeProvider>
) : (
  <View>加载中...</View>
)}
```

### 3. **小程序渲染时机问题** ⭐⭐⭐⭐
**问题**：小程序环境下组件挂载时机不同

**快速修复**：
```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  // 小程序环境下延迟渲染
  setTimeout(() => {
    setMounted(true);
  }, 100);
}, []);

if (!mounted) return <View>加载中...</View>;

return (
  <RuntimeProvider eventConfig={eventJson?.present?.data}>
    <SchemaField schema={designableJson?.schema} />
  </RuntimeProvider>
);
```

### 4. **Taroify 样式未引入** ⭐⭐⭐
**问题**：Taroify 组件样式未正确引入

**快速修复**：
```tsx
// 在 app.tsx 或入口文件顶部添加
import '@taroify/core/index.css';
import '@taroify/icons/index.css';
```

### 5. **Formily 版本兼容性** ⭐⭐⭐
**问题**：Formily 版本与 Taro 不兼容

**快速修复**：
```bash
# 检查并更新到兼容版本
npm install @formily/core@^2.2.0 @formily/react@^2.2.0
```

## 🚀 一键修复代码模板

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View } from '@tarojs/components';
import { FormProvider, createSchemaField } from '@formily/react';
import { createForm } from '@formily/core';
import { Input, Button } from '@taroify/core';
import '@taroify/core/index.css';

const YourComponent = () => {
  const [mounted, setMounted] = useState(false);
  const form = useMemo(() => createForm(), []);

  // 创建 SchemaField 并注册组件
  const SchemaField = useMemo(() => {
    return createSchemaField({
      components: {
        View,
        Input,
        Button,
        // 添加你使用的所有组件
      },
    });
  }, []);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    
    // 设置表单值
    if (eventJson?.present?.data) {
      form.setValues(eventJson.present.data);
    }
  }, [eventJson, form]);

  // 确保数据完整
  if (!mounted || !eventJson?.present?.data || !designableJson?.schema) {
    return <View>加载中...</View>;
  }

  return (
    <FormProvider form={form}>
      <SchemaField schema={designableJson.schema} />
    </FormProvider>
  );
};
```

## 🔍 调试步骤

1. **打开小程序开发者工具控制台**
   - 查看是否有错误信息
   - 检查是否有组件未注册的警告

2. **添加调试日志**
```tsx
useEffect(() => {
  console.log('eventJson:', eventJson);
  console.log('designableJson:', designableJson);
  console.log('schema:', designableJson?.schema);
}, [eventJson, designableJson]);
```

3. **检查网络请求**
   - 确认 `eventJson` 和 `designableJson` 的数据是否正确返回
   - 检查数据结构是否符合预期

4. **检查样式**
   - 在小程序开发者工具中查看元素
   - 确认组件是否渲染但被隐藏（样式问题）

## ✅ 检查清单

- [ ] `createSchemaField` 中注册了所有使用的组件
- [ ] 添加了数据加载完成检查
- [ ] 引入了 Taroify 样式文件
- [ ] 使用了 `useEffect` 确保小程序环境下正确挂载
- [ ] 检查了控制台是否有错误
- [ ] 确认 `eventJson` 和 `designableJson` 数据正确
- [ ] 检查了 Taro 配置文件

## 📝 常见错误信息及解决方案

### 错误：`Component is not registered`
**解决**：在 `createSchemaField` 的 `components` 中注册该组件

### 错误：`Cannot read property 'xxx' of undefined`
**解决**：添加数据存在性检查，使用可选链操作符

### 错误：样式不生效
**解决**：检查样式文件是否正确引入，检查小程序样式作用域配置

### 错误：表单不显示但无报错
**解决**：检查 schema 数据结构是否正确，添加调试日志查看 schema 内容
