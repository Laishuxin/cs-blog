import { delay } from "./utils";

export class VAxiosRetry {
  /**
   * @param { import('axios').AxiosInstance } axiosInstance
   * @param { import('axios').AxiosError } error
   */
  retry(axiosInstance, error) {
    const { config } = error;
    if (
      config == null ||
      config.requestOptions == null ||
      config.requestOptions.retryRequest == null
    ) {
      return Promise.reject(error);
    }

    const { wait, count } = config.requestOptions.retryRequest;
    if (count == 0) {
      return Promise.reject(error);
    }

    const retryCount = config.__retryCount || 0;

    if (retryCount >= count) {
      // 超过重新请求次数
      return Promise.reject(error);
    }

    config.__retryCount = retryCount + 1;

    return delay(wait).then(() => axiosInstance.request(config));
  }
}
