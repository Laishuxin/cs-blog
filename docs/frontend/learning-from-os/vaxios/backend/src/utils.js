class ApiException extends Error {
  /**
   * @param {*} code
   * @param {*} message
   * @param { undefined | any } result
   */
  constructor(code, message, result) {
    super(message);
    this.code = code;
    this.message = message;
    this.result = result || null;
    this.type = "error";
  }
}

class ApiResponse {
  constructor(code, result, message, type = "success") {
    this.code = code || 200;
    this.result = result || null;
    this.message = message;
    this.type = type;
  }

  static success(result, message = "成功") {
    return new ApiResponse(200, result, message);
  }

  /**
   * @param { ApiException } apiException
   * @returns
   */
  static error(apiException) {
    return new ApiResponse(
      apiException.code,
      null,
      apiException.message,
      apiException.type
    );
  }
}

function sleep(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

module.exports = {
  ApiException,
  ApiResponse,
  sleep,
};
