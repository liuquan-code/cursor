import { createSchemaField } from '@formily/react'
import * as Components from './index'
import { withCustomWrapper } from '../hocs/withCustomWrapper'

/**
 * 🚫 布局组件与被动展示组件黑名单
 * 这些组件主要负责结构渲染或纯文本展示，不产生高频交互事件，
 * 且通常作为容器存在，包裹 CustomWrapper 可能导致样式隔离问题或层级过深。
 */
const EXCLUDED_COMPONENTS = new Set([
  'FormLayout',
  'FormItem', // FormItem 负责 Label/Error 渲染，通常不需要隔离，且它是高频容器
  'FormGrid',
  'Grid',
  'GridContainer', // 网格容器组件，作为布局容器存在
  'GridRow', // 网格行组件
  'GridCol', // 网格单元格组件
  'Card',
  'Space',
  'Section',
  'Box',
  'Root', // 根节点通常不包
  'Text',
  'View',
])

// 🔧 修复：检测小程序环境
const isMiniProgram = process.env.TARO_ENV !== 'h5'

// 1. 预处理组件集合 (处理命名映射与解构)
// 注意：Spread 操作符用于将 Module Namespace 对象转换为普通对象，防止只读属性错误
const rawComponents = {
  ...Components,
  // 【关键保留】特殊映射逻辑
  Actionbar: Components.ActionBar,
}

// 2. 动态构建优化后的组件表
const optimizedComponents = Object.keys(rawComponents).reduce(
  (buf, key) => {
    const component = rawComponents[key]

    // 如果是布局组件、或者组件本身不存在，则保持原样
    if (EXCLUDED_COMPONENTS.has(key) || !component) {
      buf[key] = component
      return buf
    }

    // 🔧 修复：小程序环境下不使用 withCustomWrapper
    // 因为 withCustomWrapper 可能在小程序环境下导致组件无法渲染
    if (isMiniProgram) {
      // 小程序环境：直接使用原组件，不使用 wrapper
      buf[key] = component
    } else {
      // H5 环境：使用 withCustomWrapper（保持原有逻辑）
      buf[key] = withCustomWrapper(component)
    }
    
    return buf
  },
  {} as Record<string, unknown>
)

// 调试信息（开发环境）
if (process.env.NODE_ENV === 'development') {
  console.log('=== SchemaField 组件注册 ===')
  console.log('环境:', process.env.TARO_ENV)
  console.log('是否为小程序:', isMiniProgram)
  console.log('注册组件数:', Object.keys(optimizedComponents).length)
}

export const SchemaField = createSchemaField({
  components: optimizedComponents,
})

export default SchemaField
