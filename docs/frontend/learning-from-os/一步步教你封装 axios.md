# 一步步教你封装 axios

## 写在前面

本期参考的项目是 vue3 个一个开源 admin 项目：
[vue-vben-admin](https://github.com/vbenjs/vue-vben-admin)

## 为什么要封装 axios

axios 作为前端最受欢迎的网络请求库，只提供了最基本的网络封装，
但是落实到业务层面，进一步的封装有利于我们使用起来更为便捷。

例如：我们请求后端接口后，返回的数据如下所示：

![](images/2022-10-23-14-46-44.png)

每次我们要拿到后端返回的数据，我们不得不采用如下的方式：

```javascript
axios
  .request({
    method: 'get',
    url: '/api/data',
  })
  .then((res) => {
    const data = res.data
  })
```

当接口数量多起来的时候，会存在**大量**重复的代码。其次，在大多数公司里面，
网络请求状态默认是 200，本次请求正确与否会根据一个状态码来标识，如下图：

（状态码由内部规定，这里我们把 `code=200` 认为是本次请求是成功的，
`code≠200` 我们认为是失败的）

![](images/2022-10-23-14-50-29.png)

所以，本次请求是否成功我们还需要进一步判断：

```javascript
axios
  .request({
    method: 'get',
    url: '/api/data',
  })
  .then((res) => {
    const data = res.data
    if (data.code != 200) {
      throw new Error(data.message)
    } else {
      return data.result
    }
  })
```

当然我们可以用 axios 的 拦截器功能实现：

```javascript
const http = axios.create()
http.interceptors.response.use((res) => {
  const { data } = res
  if (data.code != 200) {
    throw new Error(data.message)
  } else {
    return data.result
  }
})
```

在上面的代码中，我们不仅要创建 axios 实例（AxiosInstance），同时还需要配置拦截器，
能否我们在一开始创建的时候就传入 interceptors？
答案是否定的。axios 没有提供一开始传入 interceptors 的功能。

有时候我们又需要拿到原始 axios 请求对象，来拿到网络请求的 `config`，用拦截器后，我们就
拿不到 `config`，那有没有办法在发起请求时候我们简单配置后就可以拿到原始的网络请求，例如：

```javascript
myAxios.request(
  {
    method: 'get',
    url: '/api/data',
  },
  {
    // 返回原始 axios 响应
    isReturnNativeResponse: true,
  },
)
```

---

再者说，axios 也提供了取消网络请求的功能，我们可以用来取消重复的请求，
但是每次都手动管理会非常繁琐，我们能否统一配置，只要我们修改配置参数，
我们的请求就自动开启取消重复请求的功能，如下：

```javascript
myAxios.request(
  {
    method: 'get',
    url: '/api/data',
  },
  {
    // 忽略重复请求
    ignoreCancel: true,
  },
)

myAxios.request(
  {
    method: 'get',
    url: '/api/data',
  },
  {
    // 允许重复请求
    ignoreCancel: false,
  },
)
```

本文参考 vue-vben-admin 项目中 axios 对 axios 的封装所写的，
提取了较为核心的部分作为分享。

## 基础配置

在开始本项目之前，请 clone 项目所在的代码仓库，并切换到 `chore: 1. 提供基础的工具` 分支下。

完成后，我们可以看到当前的目录结果如下：

```sh
├───backend # 模拟后端接口请求
├───frontend # 用于调试的前端 app
└───lib # 我们进行封装的 axios
```

在仓库的**根目录** `npm run bootstrap` 安装三个库所需要的依赖。
依赖安装完成后，我们运行 `npm run dev:server` 和 `npm run dev:client` 分别启动
我们的服务器和客户端（涉及到 vite 代理，这里需要先启动服务器）。

后端接口链接为：[http://localhost:3000](http://localhost:3000)

前端 app 链接为：[http://127.0.0.1:5173/](http://127.0.0.1:5173/)

我们打开前端 app，点击按钮，看到如下图所示，表示我们已经启动成功：

![](images/2022-10-23-15-42-28.png)

### API 接口

api 接口链接： http://localhost:3000/api
用于我们用了 vite 代理，会将 `http://127.0.0.1:5173/api` 的请求代理
到 `http://localhost:3000/api` 上，所以我们在前端调用的 axios 请求如下：

```javascript
axios.request({
  method: 'get',
  // 相当于 http://localhost:5173/api/data
  // 经过代理后会转发到 http://localhost:3000/api/data
  url: '/api/data',
})
```

默认请求格式：application:json
默认延迟返回：200 ms

统一返回的数据为：

```javascript
const response = {
  code: 200, // 本次请求的状态码，200 表示成功。
  result: {}, // 本次请求的结果。
  message: '成功', // 本次请求的消息，用于前端展示（如果需要的话）。
  type: 'success', // 类型，可以用于配置 message box，也可以忽略，为 'success', 'warning', 'error' 一个。
}
```

本项目提供了几个简单的接口：

- `GET /api/data`：获取数据。
- `GET /api/error`：模拟请求失败。
- `POST /api/login`：模拟登录，成功返回 `access_token`。
  ```javascript
  // 表单数据
  const data = { username: 'admin', password: 'admin' }
  ```
- `GET /api/sleep`：模拟延迟返回结果。

  ```javascript
  // 请求参数
  const params = { timeout: 200 }
  ```

- `GET /api/secret`：模拟需要认证的请求。
  ```javascript
  // 请求头
  const headers = { Authorization: 'Bearer fake token' }
  ```

具体实现请看 `/backend/src/index.js`

### 依赖说明

1. 我们封装的 axios 要求版本在 `v0.22.0` 及以上。
   （会用到 `AbortController`，如果实际项目低于该版本，需要调整一下取消重复请求部分的代码，
   但总体逻辑不变。）
2. 本项目的 utils 会依赖到 `lodash-es`，可以根据实际需要调整。所有的工具依赖存放在 `/lib/src/utils.js` 下。

在项目开始之前，我们先实现几个简单工具类：

```javascript
// /lib/src/utils.js
import { merge } from 'lodash-es'
export { clone, cloneDeep, isFunction, isString } from 'lodash-es'

/**
 * 浅合并对象，返回一个全新的对象，并且不会影响原有的对象。
 */
export function shallowMerge(...objects) {
  return Object.assign({}, ...objects)
}

/**
 * 深合并对象，返回一个全新的对象，并且不会影响原有的对象。
 */
export function deepMerge(...objects) {
  return merge({}, ...objects)
}

/**
 * 将 v 强制转为 boolean
 * @param {*} v
 * @returns { boolean }
 */
export function toBoolean(v) {
  return !!v
}

/**
 * 延迟执行
 * @param { number } timeout
 */
export function sleep(timeout) {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}

export const delay = sleep

/**
 * 空值判断
 * @param { unknown } v
 * @returns { boolean }
 */
export function isVoid(v) {
  return v === null || v === undefined || v === ''
}
```

## 拦截器

在前面我们提到了 axios 拦截器需要实例化后才能添加。为了实现一开始实例化 axios 时，
通过参数配置拦截器，我们需要对 axios 进行封装。

基于**组合优于继承**的设计理念，我们会创建自己的 axios 类（VAxios），并采用组合的方式对其进行拓展。
我们的 VAxios 会在原先 axios 实例对象参数基础上添加几个重要的参数：

```typescript
// /lib/typings/index.d.ts
export interface CreateAxiosOptions extends AxiosRequestConfig {
  // 认证模型，默认为 Bearer （jwt token）
  authenticationScheme?: string
  // 存放所有对数据进行转换的函数
  transform: AxiosTransform
  // 实际请求的配置项
  requestOptions: RequestOptions
}
```

（本项目是基于 javascript 实现的，对 typescript 不太熟悉也不会影响对后续的实现逻辑）

我们期望的效果如下：

```javascript
const myAxios = new VAxios({
  transform: {
    requestInterceptors: () => {},
    requestInterceptorsCatch: () => {},
    responseInterceptors: () => {},
    responseInterceptorsCatch: () => {},
  },
  // ...原始 axios config
})
```

当传入的 `transform` 有对应的拦截函数，VAxios 自动帮我们注册拦截器。

下面让我们实现第一版的拦截器：

```javascript
// /lib/src/v-axios.js
import axios from 'axios'
import { isFunction } from './utils'

export class VAxios {
  /**
   * @param { import('./typings').CreateAxiosOptions } options
   */
  constructor(options) {
    this._options = options
    this._axiosInstance = axios.create(options)
    this._setupInterceptor()
  }

  _setupInterceptor() {
    const { transform } = this._options
    const {
      requestInterceptors,
      requestInterceptorsCatch,
      responseInterceptors,
      responseInterceptorsCatch,
    } = transform || {}

    // 添加请求拦截器
    if (isFunction(requestInterceptors)) {
      this._axiosInstance.interceptors.request.use((config) => {
        // 为了针对不同请求进行处理，我们将实例化的 options 也一并传过去
        return requestInterceptors(config, this._options)
      })
    }

    // 添加请求异常拦截器
    if (isFunction(requestInterceptorsCatch)) {
      this._axiosInstance.interceptors.request.use(undefined, (error) => {
        return requestInterceptorsCatch(error, this._options)
      })
    }

    // 添加响应拦截器
    if (isFunction(responseInterceptors)) {
      // 后面我们会合并配置，所有的配置会存放到 res.config 下，所以我们只需要传 res
      this._axiosInstance.interceptors.response.use((res) => {
        return responseInterceptors(res)
      })
    }

    // 添加响应异常拦截器
    if (isFunction(responseInterceptorsCatch)) {
      this._axiosInstance.interceptors.response.use(undefined, (error) => {
        // 涉及到超时请求我们把 axiosInstance 也一并传过去
        // 方便超时进行请求
        return responseInterceptorsCatch(this._axiosInstance, error)
      })
    }
  }
}
```

接下来，我们在前端 app 简单测试下：

```vue
<template>
  <!-- /frontend/src/App.vue -->
  <div>
    <h1>
      测试基础的拦截器
    </h1>
    <el-button @click="handleTestRequestInterceptor()">
      测试请求拦截器
    </el-button>

    <el-button @click="handleTestResponseInterceptor()">
      测试响应拦截器
    </el-button>

    <el-button @click="handleTestResponseCatchInterceptor()">
      测试响应异常拦截器
    </el-button>
  </div>
</template>

<script>
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { VAxios } from '../../lib/src/v-axios'

export default {
  setup() {
    const handleTestRequestInterceptor = () => {
      const vAxios = new VAxios({
        transform: {
          requestInterceptors(config, options) {
            const headers = config.headers
            headers['Authorization'] = `Bearer fake token`
            config.headers = headers

            // 注意返回 config，否则无法执行
            return config
          },
        },
      })

      // 不推荐直接用 _axiosInstance 发起请求，后面会优化
      vAxios._axiosInstance
        .request({
          url: '/api/data',
        })
        .then((res) => {
          console.log('res: ', res)
        })
    }

    const handleTestResponseInterceptor = () => {
      const vAxios = new VAxios({
        transform: {
          responseInterceptors(res) {
            const { data } = res
            if (data.code == 200) return data.result
            throw new Error(data.message)
          },
        },
      })

      // 不推荐直接用 _axiosInstance 发起请求，后面会优化
      vAxios._axiosInstance
        .request({
          url: '/api/data',
        })
        .then((res) => {
          console.log('res: ', res)
        })
    }

    const handleTestResponseCatchInterceptor = () => {
      const vAxios = new VAxios({
        transform: {
          responseInterceptorsCatch(instance, error) {
            console.log('捕获异常: ', error)
            throw error
          },
        },
      })

      // 不推荐直接用 _axiosInstance 发起请求，后面会优化
      vAxios._axiosInstance.request({
        url: '/not-found',
      })
    }

    return {
      handleTestRequestInterceptor,
      handleTestResponseInterceptor,
      handleTestResponseCatchInterceptor,
    }
  },
}
</script>
```

1. 测试请求拦截器：当我们点击 `测试请求拦截器` 后，我们可以在网络请求看到 header 上自动加上 `Authorization`
   说明我们配置成功。
   ![](images/2022-10-23-17-34-59.png)

2. 测试响应拦截器：当我们点击 `测试响应拦截器` 后，我们可以在网络请求看到请求成功，并在**控制台**打印出实际的结果，说明我们配置成功。
   ![](images/2022-10-23-17-39-04.png)
3. 测试响应异常拦截器：我们请求一个**不存在**的接口，当我们点击 `测试响应异常拦截器` 后，在**控制台**打印出错误异常，说明我们配置成功。
   ![](images/2022-10-23-17-40-48.png)

细心的小伙伴也发现了，我们并没有对请求异常进行测试。这是因为这种情况很少出现，其次我们也可以其他手段捕获到请求
异常，这里我们就不进行测试。

## 取消重复请求

## 支持 form-data

## http 请求

## 默认配置

## 总结
