import axios from "axios";
import { ContentTypes, RequestMethods } from "./constant";
import {
  cloneDeep,
  deepMerge,
  isFunction,
  shallowMerge,
  toBoolean,
} from "./utils";
import { VAxiosCanceller } from "./vaxios-canceller";

export class VAxios {
  /**
   * @param { import('./interface').CreateAxiosOptions } options
   */
  constructor(options) {
    // 初始化 axios 的配置
    this._options = options;
    this._axiosInstance = axios.create(options);
    this._setupInterceptors();
  }

  _setupInterceptors() {
    const { transform } = this._options;
    const {
      requestInterceptors,
      requestInterceptorsCatch,
      responseInterceptors,
      responseInterceptorsCatch,
    } = transform || {};

    const vAxiosCanceller = new VAxiosCanceller();

    // 1. 添加自动取消重复请求
    // 2. 执行请求配置拦截。
    this._axiosInstance.interceptors.request.use((config) => {
      /**
       * 从当前最新的 config 中检查是否有 requestOptions，
       * 没有的话，从一开始（全局）的配置中获取 requestOptions
       */
      const requestOptions = config.requestOptions;
      let ignoreCancel = false;

      // 从最新的 config 获取
      if (requestOptions != null && requestOptions.ignoreCancel !== undefined) {
        ignoreCancel = requestOptions.ignoreCancel;
        // 从全局的 config 获取
      } else if (this._options.requestOptions && this._options.requestOptions) {
        ignoreCancel = this._options.requestOptions.ignoreCancel;
      }

      // ignoreCancel 可能是 undefined 之类的空值，我们转为 boolean
      ignoreCancel = toBoolean(ignoreCancel);

      // 需要删除重复请求
      if (ignoreCancel != true) {
        vAxiosCanceller.addPending(config);
      }

      if (isFunction(requestInterceptors)) {
        // 更新请求拦截
        config = requestInterceptors(config, this._options);
      }
      return config;
    });

    // 添加请求异常拦截器
    if (isFunction(requestInterceptorsCatch)) {
      this._axiosInstance.request.use(undefined, requestInterceptorsCatch);
    }

    /**
     * 1. 废弃重复请求，避免内存泄漏。
     * 2. 添加响应拦截器
     */
    this._axiosInstance.interceptors.response.use((res) => {
      vAxiosCanceller.removePadding(res.config);
      if (isFunction(responseInterceptors)) {
        res = responseInterceptors(res);
      }
      return res;
    });

    // 添加响应异常拦截器
    this._axiosInstance.interceptors.response.use(undefined, (error) => {
      if (axios.isAxiosError(error)) {
        vAxiosCanceller.reset();
      }
      if (isFunction(responseInterceptorsCatch)) {
        return responseInterceptorsCatch(this._axiosInstance, error);
      }
    });
  }

  /**
   * 是否需要支持 form-data 请求
   * @param { import("axios").AxiosRequestConfig } config
   */
  _shouldSupportFormData(config) {
    let { method, headers, data } = config;
    method = method || RequestMethods.GET;
    method = method.toUpperCase();

    // GET 请求不需要支持 form-data
    if (method == RequestMethods.GET) return false;
    // 没有数据不需要支持 form-data
    if (data == null) return false;

    if (headers == null) {
      headers = this._options.headers;
    }

    if (headers == null) return false;
    const contentType = headers["content-type"] || headers["Content-Type"];
    if (contentType != ContentTypes.FORM_URLENCODED) return false;

    return true;
  }

  /**
   * 支持 form-data 请求
   * @param { import("axios").AxiosRequestConfig } config
   */
  supportFormData(config) {
    if (this._shouldSupportFormData(config)) {
      return shallowMerge(config, {
        data: qs.stringify(config.data, { arrayFormat: "brackets" }),
      });
    } else {
      return config;
    }
  }

  /**
   * @param { import('axios').AxiosHeaders } headers
   */
  setHeaders(headers) {
    const defaultHeaders = this._axiosInstance.defaults.headers;
    const mergedHeaders = deepMerge(defaultHeaders, headers);
    this._axiosInstance.defaults.headers = mergedHeaders;
  }

  /**
   * @param { import("axios").AxiosRequestConfig } config
   * @param { import("./interface").RequestOptions } options
   */
  request(config, options) {
    // 合并配置
    let newConfig = cloneDeep(config);

    // 合并请求 options
    const newOptions = deepMerge(this._options.requestOptions, options);

    const transform = this._options.transform || {};
    const {
      requestCatchHook,
      beforeRequestHook,
      transformResponseHook,
    } = transform;

    // 更新配置
    if (isFunction(beforeRequestHook)) {
      newConfig = beforeRequestHook(config, newOptions);
    }

    newConfig = this.supportFormData(newConfig);
    // 将 requestOptions 挂到 config 上
    newConfig.requestOptions = newOptions;

    // 发起请求
    return new Promise((resolve, reject) => {
      this._axiosInstance
        .request(newConfig)
        .then((res) => {
          // 更新 response
          if (isFunction(transformResponseHook)) {
            try {
              res = transformResponseHook(res, newOptions);
              resolve(res);
            } catch (err) {
              reject(err);
            }

            return;
          }

          resolve(res);
        })
        .catch((err) => {
          // 更新异常
          if (isFunction(requestCatchHook)) {
            reject(requestCatchHook(err, newOptions));
          } else {
            reject(err);
          }
        });
    });
  }

  /**
   * @param { import("axios").AxiosRequestConfig } config
   * @param { import("./interface").RequestOptions } options
   */
  get(config, options) {
    return this.request({ ...config, method: RequestMethods.GET }, options);
  }

  /**
   * @param { import("axios").AxiosRequestConfig } config
   * @param { import("./interface").RequestOptions } options
   */
  post(config, options) {
    return this.request({ ...config, method: RequestMethods.POST }, options);
  }

  /**
   * @param { import("axios").AxiosRequestConfig } config
   * @param { import("./interface").RequestOptions } options
   */
  put(config, options) {
    return this.request({ ...config, method: RequestMethods.PUT }, options);
  }

  /**
   * @param { import("axios").AxiosRequestConfig } config
   * @param { import("./interface").RequestOptions } options
   */
  delete(config, options) {
    return this.request({ ...config, method: RequestMethods.DELETE }, options);
  }
}
