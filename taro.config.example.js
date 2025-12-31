/**
 * Taro 配置文件示例
 * 用于解决 Formily + Taroify 在小程序中的兼容性问题
 */

const config = {
  projectName: 'your-project-name',
  date: '2024-1-1',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {},
  },
  framework: 'react',
  compiler: {
    type: 'webpack5', // 推荐使用 webpack5
    prebundle: {
      enable: false, // Formily 可能需要关闭预构建
    },
  },
  cache: {
    enable: true, // 开启缓存提升构建速度
  },
  mini: {
    // 小程序相关配置
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          selectorBlackList: ['nut-'], // 排除某些类名
        },
      },
      url: {
        enable: true,
        config: {
          limit: 1024, // 设定转换尺寸上限
        },
      },
      cssModules: {
        enable: false, // 如果 Formily 样式有问题，可以尝试关闭
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
    // 添加全局样式
    addChunkPages(pages) {
      // 确保 Formily 相关代码被打包
      pages.set('pages/index/index', ['formily-chunk']);
    },
    // 优化配置
    optimizeMainPackage: {
      enable: true,
    },
    // 编译排除
    compile: {
      exclude: [
        // 排除不需要的文件，但不要排除 Formily 相关
      ],
    },
  },
  h5: {
    // H5 相关配置
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
    // H5 路由配置
    router: {
      mode: 'hash',
      customRoutes: {},
    },
  },
  // 别名配置
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
    '@formily/react': path.resolve(__dirname, '..', 'node_modules/@formily/react'),
    '@formily/core': path.resolve(__dirname, '..', 'node_modules/@formily/core'),
  },
  // 环境变量
  env: {
    NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
  },
};

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'));
  }
  return merge({}, config, require('./prod'));
};
