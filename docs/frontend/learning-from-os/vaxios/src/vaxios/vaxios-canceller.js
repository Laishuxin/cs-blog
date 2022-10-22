/**
 * @param { import("axios").AxiosRequestConfig } config
 */
function getControllerUrl(config) {
  const { method, url } = config;
  // 这里的 method 会经过 axios 正规化，会是 http method 中的一个
  // 我们采用 method + & + url 来标识同一个请求
  return `${method}&${url}`;
}

export class VAxiosCanceller {
  constructor() {
    /** @type { Map<string, AbortController> } */
    this._urlToControllerMap = new Map();
  }

  /**
   * 根据请求配置，将 ajax 请求加入 map。
   * 有新的请求的时候，会根据请求生成 url(唯一标识当前请求)
   * 如果 map 中已经存在，则说明是重复请求，会废弃（abort）前一个请求。
   * @param { import("axios").AxiosRequestConfig } config
   */
  addPending(config) {
    this.removePadding(config);
    const url = getControllerUrl(config);

    /** @see https://axios-http.com/docs/cancellation */
    if (config.signal == null) {
      const controller = new AbortController();
      config.signal = controller.signal;
      this._urlToControllerMap.set(url, controller);
    }
  }

  /**
   * @param { import("axios").AxiosRequestConfig } config
   */
  removePadding(config) {
    const url = getControllerUrl(config);
    const controller = this._urlToControllerMap.get(url);
    if (controller != null) {
      controller.abort();
      this._urlToControllerMap.delete(url);
    }
  }

  removeAllPending() {
    // 取消所有的请求
    this._urlToControllerMap.forEach((controller) => controller.abort());
    // 清空缓存
    this._urlToControllerMap.clear();
  }

  reset() {
    this._urlToControllerMap = new Map();
  }
}
