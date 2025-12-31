import React, { useState, useEffect, useMemo } from 'react';
import { View } from '@tarojs/components';
import { FormProvider, createSchemaField } from '@formily/react';
import { createForm } from '@formily/core';
import Taro from '@tarojs/taro';

// 引入 Taroify 组件（根据实际使用的组件调整）
import { Input, Button, Checkbox, Radio, Switch, Cell, Picker } from '@taroify/core';
import '@taroify/core/index.css';
import '@taroify/icons/index.css';

interface FormilyTaroComponentProps {
  eventConfig?: any;
  store?: any;
  schema?: any;
  eventJson?: {
    present?: {
      data?: any;
    };
  };
  designableJson?: {
    schema?: any;
  };
}

/**
 * Formily + Taroify 小程序兼容组件
 * 解决小程序环境下 Formily 不显示的问题
 */
const FormilyTaroComponent: React.FC<FormilyTaroComponentProps> = ({
  eventConfig,
  store,
  schema,
  eventJson,
  designableJson,
}) => {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [formSchema, setFormSchema] = useState<any>(null);

  // 创建表单实例
  const form = useMemo(() => {
    return createForm({
      validateFirst: true,
      // 小程序环境下可能需要特殊配置
      effects() {
        // 表单副作用处理
      },
    });
  }, []);

  // 创建 SchemaField，注册所有需要的组件
  const SchemaField = useMemo(() => {
    return createSchemaField({
      components: {
        // Taro 基础组件
        View,
        // Taroify 组件
        Input,
        Button,
        Checkbox,
        Radio,
        Switch,
        Cell,
        Picker,
        // 如果需要自定义组件，在这里注册
      },
    });
  }, []);

  useEffect(() => {
    // 小程序环境下确保组件已挂载
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 处理 eventJson 数据
    const data = eventJson?.present?.data || eventConfig;
    if (data) {
      setFormData(data);
      // 设置表单初始值
      try {
        form.setValues(data);
      } catch (error) {
        console.error('设置表单值失败:', error);
      }
    }
  }, [eventJson, eventConfig, form]);

  useEffect(() => {
    // 处理 schema 数据
    const schemaData = designableJson?.schema || schema;
    if (schemaData) {
      setFormSchema(schemaData);
    }
  }, [designableJson, schema]);

  // 确保所有数据加载完成后再渲染
  const shouldRender = mounted && formData !== null && formSchema !== null;

  // 调试信息（开发环境）
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Formily 渲染状态:', {
        mounted,
        hasFormData: !!formData,
        hasSchema: !!formSchema,
        shouldRender,
        formData,
        formSchema,
      });
    }
  }, [mounted, formData, formSchema, shouldRender]);

  if (!shouldRender) {
    return (
      <View className="formily-loading" style={{ padding: '20px', textAlign: 'center' }}>
        <View>表单加载中...</View>
      </View>
    );
  }

  return (
    <View className="formily-container" style={{ width: '100%' }}>
      <FormProvider form={form}>
        <SchemaField schema={formSchema} />
      </FormProvider>
    </View>
  );
};

/**
 * 使用示例：
 * 
 * <FormilyTaroComponent
 *   eventConfig={eventJson?.present?.data}
 *   store={useStore}
 *   schema={designableJson?.schema}
 * />
 * 
 * 或者分别传入：
 * 
 * <FormilyTaroComponent
 *   eventJson={eventJson}
 *   designableJson={designableJson}
 * />
 */
export default FormilyTaroComponent;
