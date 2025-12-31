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
  'FormItem',
  'FormGrid',
  'Grid',
  'GridContainer',
  'GridRow',
  'GridCol',
  'Card',
  'Space',
  'Section',
  'Box',
  'Root',
  'Text',
  'View',
])

// 检测是否为小程序环境
const isMiniProgram = process.env.TARO_ENV !== 'h5'

// 检查 withCustomWrapper 是否可用
let useCustomWrapper = true
try {
  // 尝试调用 withCustomWrapper，如果出错则禁用
  if (typeof withCustomWrapper !== 'function') {
    console.warn('withCustomWrapper 不是函数，将禁用 wrapper')
    useCustomWrapper = false
  }
} catch (error) {
  console.warn('withCustomWrapper 检查失败，将禁用 wrapper:', error)
  useCustomWrapper = false
}

// 1. 预处理组件集合 (处理命名映射与解构)
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

    // 🔧 修复方案：小程序环境下不使用 withCustomWrapper
    if (isMiniProgram) {
      // 小程序环境：直接使用原组件
      buf[key] = component
    } else if (useCustomWrapper) {
      // H5 环境：尝试使用 withCustomWrapper
      try {
        buf[key] = withCustomWrapper(component)
      } catch (error) {
        console.warn(`包装组件 ${key} 失败，使用原组件:`, error)
        buf[key] = component
      }
    } else {
      // withCustomWrapper 不可用，直接使用原组件
      buf[key] = component
    }
    
    return buf
  },
  {} as Record<string, unknown>
)

// 调试：输出组件注册信息
if (process.env.NODE_ENV === 'development') {
  console.log('=== SchemaField 组件注册信息 ===')
  console.log('环境:', process.env.TARO_ENV)
  console.log('是否为小程序:', isMiniProgram)
  console.log('使用 CustomWrapper:', !isMiniProgram && useCustomWrapper)
  console.log('注册的组件数量:', Object.keys(optimizedComponents).length)
  console.log('注册的组件列表:', Object.keys(optimizedComponents))
  
  // 检查关键组件是否存在
  const keyComponents = ['View', 'Text', 'Input', 'Button', 'FormItem']
  keyComponents.forEach(key => {
    const comp = optimizedComponents[key]
    if (comp) {
      console.log(`✓ ${key} 已注册 (类型: ${typeof comp})`)
    } else {
      console.warn(`✗ ${key} 未注册`)
    }
  })
  
  // 检查组件是否被正确包装
  const testComponent = optimizedComponents['Input']
  if (testComponent) {
    console.log('Input 组件:', testComponent)
    console.log('Input 组件名称:', testComponent.displayName || testComponent.name || '未知')
  }
}

export const SchemaField = createSchemaField({
  components: optimizedComponents,
})

export default SchemaField
