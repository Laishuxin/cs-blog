import axios from "axios";
import { ContentTypes, ErrorCodes, RequestMethods } from "./constant";
import {
  deepMerge,
  clone,
  isString,
  isVoid,
  shallowMerge,
  isFunction,
} from "./utils";
import { VAxios } from "./vaxios";
import { VAxiosRetry } from "./vaxios-retry";

function cleanup() {
  return window.localStorage.removeItem("token");
}

function getToken() {
  return window.localStorage.getItem("token");
}

function handleJoinTime(config) {
  let { method } = config;
  method = method || RequestMethods.GET;
  method = method.toUpperCase();

  if (method == RequestMethods.GET) {
    const params = config.params || {};
    params["_t"] = Date.now();
    config.params = params;
  }

  return config;
}

/**
 * @type { import('./interface').AxiosTransform }
 */
const transform = {
  beforeRequestHook(config, options) {
    const { apiUrl, joinPrefix, joinTime = false, urlPrefix } = options;

    // 规范化请求 url
    if (joinPrefix && isString(urlPrefix)) {
      config.url = `${urlPrefix}${config.url}`;
    }

    if (isString(apiUrl)) {
      config.url = `${apiUrl}${config.url}`;
    }

    // 是否加入时间戳
    if (joinTime) {
      config = handleJoinTime(config);
    }

    return config;
  },

  requestInterceptors(config, options) {
    const token = getToken();
    if (isVoid(token)) return config;

    // 1. 获取最新的 requestOptions
    // 2. 不存在的话，则获取全局 requestOptions
    const requestOptions = config.requestOptions || options.requestOptions;
    const { authenticationScheme } = options;
    if (requestOptions == null || requestOptions.withToken === false) {
      return config;
    }

    // 默认是 jwt token
    const scheme = authenticationScheme || "Bearer ";

    const headers = config.headers;

    config.headers = shallowMerge(
      {
        Authorization: `${scheme}${token}`,
      },
      headers
    );

    // headers = { Authorization: 'Bearer token', ...rest }

    return config;
  },

  responseInterceptors(res) {
    return res;
  },

  transformResponseHook(res, options) {
    const {
      isTransformResponse,
      isReturnNativeResponse,
      onError,
      isCatchError,
    } = options;
    if (res == null) {
      throw new Error("请求出错，请重试");
    }

    // 返回原始的 axios 数据
    if (isReturnNativeResponse) return res;

    // 返回 api 请求的数据
    if (!isTransformResponse) return res.data;

    const { data } = res;
    if (data == null) {
      throw new Error("请求出错，请重试");
    }

    const { code, result, message } = data;

    // 请求成功，返回实际的数据
    if (code == ErrorCodes.SUCCESS) {
      return result;
    }

    // 请求失败，根据不同的 error code 处理不同的失败
    switch (code) {
      case ErrorCodes.UNAUTHORIZED:
        cleanup();
        break;
    }

    if (isFunction(onError)) {
      onError(data);
    }

    if (isCatchError !== true) {
      throw new Error(message);
    }
  },

  responseInterceptorsCatch(instance, error) {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const { code, message, config } = error;
    let errorMessage = message;

    // 是否重新发起请求
    let { method, requestOptions } = config || {};
    method = method || RequestMethods.GET;
    method = method.toUpperCase();
    if (
      code == axios.AxiosError.ECONNABORTED &&
      message.includes("timeout") &&
      method == RequestMethods.GET &&
      requestOptions &&
      requestOptions.retryRequest &&
      requestOptions.retryRequest.isOpenRetry
    ) {
      const vAxiosRetry = new VAxiosRetry();
      return vAxiosRetry.retry(instance, error);
    }

    // 处理 axios 异常，重新格式化输出格式
    if (code == axios.AxiosError.ETIMEDOUT) {
      errorMessage = "网络请求超时";
    } else if (code == axios.AxiosError.ERR_NETWORK) {
      errorMessage = "网络异常，请检查您的网络";
    }

    throw new Error(errorMessage);
  },
};

const defaultRequestOptions = {
  // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#authentication_schemes
  // authentication schemes，e.g: Bearer
  // authenticationScheme: 'Bearer',
  authenticationScheme: "",
  timeout: 10 * 1000,
  // 基础接口地址
  // baseURL: globSetting.apiUrl,

  headers: { "Content-Type": ContentTypes.JSON },
  // 如果是form-data格式
  // headers: { 'Content-Type': ContentTypeEnum.FORM_URLENCODED },
  // 数据处理方式
  transform: clone(transform),
  // 配置项，下面的选项都可以在独立的接口请求中覆盖
  requestOptions: {
    // 默认将prefix 添加到url
    joinPrefix: true,
    // 是否返回原生响应头 比如：需要获取响应头时使用该属性
    isReturnNativeResponse: false,
    // 需要对返回数据进行处理
    isTransformResponse: true,
    isCatchError: false,
    // 错误时的回调
    // onError: () => {},
    // 接口地址
    apiUrl: "",
    // 接口拼接地址
    urlPrefix: "/api",
    //  是否加入时间戳
    joinTime: false,
    // 忽略重复请求
    ignoreCancelToken: true,
    // 是否携带token
    withToken: true,
    retryRequest: {
      isOpenRetry: true,
      count: 5,
      waitTime: 100,
    },
  },
};

/**
 * @param { Partial<import("./interface").RequestOptions> } options
 */
export function createVAxios(options = {}) {
  const mergedOptions = deepMerge(defaultRequestOptions, options);

  return new VAxios(mergedOptions);
}

export const defaultHttp = createVAxios();
