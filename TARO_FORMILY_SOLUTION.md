# Taro + Formily + Taroify 小程序兼容性问题解决方案

## 问题描述
使用 Formily 的 `RuntimeProvider` 和 `SchemaField` 组件，配合 Taroify 组件库，在小程序中无法显示，但在 H5 中正常显示。

## 常见原因及解决方案

### 1. Formily 在小程序环境下的兼容性问题

#### 问题原因
- Formily 默认使用了一些小程序不支持的 DOM API
- 需要配置 Formily 的适配器

#### 解决方案

**方案 A：使用 @formily/react 的 Taro 适配器**

```tsx
import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { SchemaField } from '@formily/react-schema-renderer';
import { View, Text } from '@tarojs/components';

// 创建 SchemaField 组件（使用 Taro 组件）
const SchemaField = createSchemaField({
  components: {
    View,
    Text,
    // 添加其他需要的 Taro 组件
  },
});

// 使用方式
const form = createForm();

<FormProvider form={form}>
  <SchemaField schema={designableJson.schema} />
</FormProvider>
```

**方案 B：配置 Taro 编译选项**

在 `config/index.js` 中添加：

```javascript
module.exports = {
  // ... 其他配置
  compiler: {
    type: 'webpack5',
  },
  mini: {
    // 小程序相关配置
    compile: {
      exclude: [
        // 排除不需要的文件
      ],
    },
    // 添加全局样式
    addChunkPages(pages) {
      // 确保 Formily 相关代码被打包
    },
  },
  // 添加 alias 确保正确解析
  alias: {
    '@formily/react': '@formily/react',
    '@formily/core': '@formily/core',
  },
};
```

### 2. Taroify 组件库兼容性问题

#### 问题原因
- Taroify 组件需要正确的样式引入
- 小程序环境下样式作用域问题

#### 解决方案

**确保正确引入 Taroify 样式：**

```tsx
// 在 app.tsx 或入口文件中
import '@taroify/core/index.css';
import '@taroify/icons/index.css';
// 引入你使用的其他 Taroify 组件样式
```

**在页面组件中：**

```tsx
import { View } from '@tarojs/components';
import { Button } from '@taroify/core';
import { FormProvider, SchemaField } from '@formily/react';

// 确保样式作用域正确
<View className="formily-container">
  <FormProvider form={form}>
    <SchemaField schema={schema} />
  </FormProvider>
</View>
```

### 3. 小程序渲染时机问题

#### 问题原因
- 小程序中数据加载时机与渲染时机不匹配
- `eventJson?.present?.data` 可能在小程序环境下未及时加载

#### 解决方案

```tsx
import { useState, useEffect } from 'react';
import { View } from '@tarojs/components';
import { FormProvider, SchemaField } from '@formily/react';
import { createForm } from '@formily/core';

const YourComponent = () => {
  const [formData, setFormData] = useState(null);
  const [schema, setSchema] = useState(null);
  const [form] = useState(() => createForm());

  useEffect(() => {
    // 确保数据加载完成后再渲染
    if (eventJson?.present?.data && designableJson?.schema) {
      setFormData(eventJson.present.data);
      setSchema(designableJson.schema);
      
      // 设置表单初始值
      form.setValues(eventJson.present.data);
    }
  }, [eventJson, designableJson, form]);

  // 确保数据加载完成后再渲染 SchemaField
  if (!formData || !schema) {
    return <View>加载中...</View>;
  }

  return (
    <View className="formily-wrapper">
      <FormProvider form={form}>
        <SchemaField schema={schema} />
      </FormProvider>
    </View>
  );
};
```

### 4. 小程序样式作用域问题

#### 解决方案

**在页面配置中添加：**

```javascript
// 页面 .config.ts 或 .config.js
export default {
  styleIsolation: 'apply-shared', // 或 'isolated'
};
```

**或者使用全局样式：**

```scss
// 在 app.scss 中
.formily-wrapper {
  // Formily 相关样式
}
```

### 5. 完整的解决方案示例

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View } from '@tarojs/components';
import { FormProvider, createSchemaField } from '@formily/react';
import { createForm } from '@formily/core';
import { Input, Button, Checkbox } from '@taroify/core';
import Taro from '@tarojs/taro';

// 创建 SchemaField，注册 Taroify 组件
const SchemaField = createSchemaField({
  components: {
    Input,
    Button,
    Checkbox,
    View,
    // 注册其他需要的组件
  },
});

interface Props {
  eventJson?: {
    present?: {
      data?: any;
    };
  };
  designableJson?: {
    schema?: any;
  };
  useStore?: any;
}

const FormilyComponent: React.FC<Props> = ({
  eventJson,
  designableJson,
  useStore,
}) => {
  const [mounted, setMounted] = useState(false);
  
  // 创建表单实例
  const form = useMemo(() => {
    return createForm({
      // 表单配置
      validateFirst: true,
    });
  }, []);

  useEffect(() => {
    // 小程序环境下确保组件已挂载
    setMounted(true);
    
    // 设置表单初始值
    if (eventJson?.present?.data) {
      form.setValues(eventJson.present.data);
    }
  }, [eventJson, form]);

  // 确保数据完整后再渲染
  const shouldRender = mounted && 
    eventJson?.present?.data && 
    designableJson?.schema;

  if (!shouldRender) {
    return (
      <View className="loading-container">
        <View>加载中...</View>
      </View>
    );
  }

  return (
    <View className="formily-container">
      <FormProvider form={form}>
        <SchemaField schema={designableJson.schema} />
      </FormProvider>
    </View>
  );
};

export default FormilyComponent;
```

### 6. Taro 配置检查清单

**检查 `config/index.js`：**

```javascript
module.exports = {
  // 确保使用正确的编译类型
  compiler: {
    type: 'webpack5', // 或 'webpack4'
  },
  
  mini: {
    // 小程序配置
    postcss: {
      // PostCSS 配置
    },
    // 确保样式正确处理
    cssModules: {
      enable: false, // 如果 Formily 样式有问题，可以尝试关闭
    },
  },
  
  // 确保 H5 和小程序都正确配置
  h5: {
    // H5 配置
  },
};
```

### 7. 调试方法

**在小程序中添加调试信息：**

```tsx
useEffect(() => {
  console.log('eventJson:', eventJson);
  console.log('designableJson:', designableJson);
  console.log('schema:', designableJson?.schema);
  console.log('form:', form);
  
  // 检查表单状态
  form.subscribe((formState) => {
    console.log('formState:', formState);
  });
}, [eventJson, designableJson, form]);
```

### 8. 常见错误排查

1. **检查控制台错误**：查看小程序开发者工具的控制台是否有报错
2. **检查网络请求**：确认 `eventJson` 和 `designableJson` 的数据是否正确加载
3. **检查组件注册**：确保所有使用的组件都在 `createSchemaField` 中注册
4. **检查样式**：确认 Taroify 样式文件正确引入
5. **检查 Taro 版本**：确保 Taro 版本与 Formily、Taroify 兼容

### 9. 推荐的依赖版本

```json
{
  "dependencies": {
    "@formily/core": "^2.x.x",
    "@formily/react": "^2.x.x",
    "@formily/react-schema-renderer": "^2.x.x",
    "@tarojs/taro": "^3.x.x",
    "@tarojs/components": "^3.x.x",
    "@taroify/core": "^1.x.x",
    "@taroify/icons": "^1.x.x"
  }
}
```

## 快速修复步骤

1. ✅ 检查 Formily 组件是否正确注册了 Taro 组件
2. ✅ 确保 Taroify 样式文件已引入
3. ✅ 添加数据加载完成检查，避免空数据渲染
4. ✅ 使用 `useEffect` 确保小程序环境下组件正确挂载
5. ✅ 检查 Taro 配置文件，确保编译选项正确
6. ✅ 在小程序开发者工具中查看控制台错误信息
