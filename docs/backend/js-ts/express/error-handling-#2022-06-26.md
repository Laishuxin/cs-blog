---
highlight: tomorrow-night-blue
theme: smartblue
---

（代码见：https://github.com/Laishuxin/cs-blog/tree/main/playground/backend/js-ts/express-error-handling ）

# Express 对异常的统一处理

项目开发过程中，优雅地处理异常是一个好的工程师必备的素养。最近在项目开发过程中，
经常捕获到一些奇怪的异常（如下图）。显然，这是没有对异常进行处理的结果。

![2022-06-27-23-31-07.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/898492c7f9fc4c039a7d27de48ddad9a~tplv-k3u1fbpfcp-watermark.image?)

下面 👇，我们将采用 `Express` + `Typescript` 来演示如何对异常进行处理。

通过本文，你可以学到以下知识 👏：

- 捕获所有类型的异常。
- 用一个处理器对所有的异常进行统一处理。
- 自定义异常处理中间件。
- 自定义 `Error` 类。

## 预备条件

环境配置

```sh
yarn init --yes

yarn add express
yarn add -D @types/express @types/node ts-node-dev typescript cross-en

# Windows 注意 shell 环境的差异
mkdir src
touch src/index.ts
```

启动：

```typescript
// src/index.ts
import express from "express";
import { router } from "./routes";

const app = express();
const PORT = 3002;

app.use(router);

app.listen(PORT, () => {
  console.log(`server is listening on ${PORT}`);
});
```

## 同步异常捕获

通常最好的做法是捕获所有的异常，并根据不同的异常做出处理。有时候我们会忘记对异常进行处理，好在 `Express` 会默认将同步异常交由中间件进行处理。

可以看以下示例：

```typescript
// src/routes/index.ts
import express from "express";
export const router = express();

router.get("/", (req, res) => {
  throw new Error("this is an error");
  res.json({ message: "ok" });
});
```

当我们访问 `/` 时，会看到如下异常：

```sh
Error: this is a error
...
```

在生产环境（`NODE_ENV='production'`）时，`Express` 会对同步异常进行加工处理，
于是我们的请求结果为

```
Internal Server Error
```

然而，对于异步异常 `Express` 是不会进行处理的。

## 异步异常捕获

在 `Express` 4 及以下版本中，异步异常会被跳过。

来看下面基于 `Express4` 的示例，我们在 `Promise` 中 抛出一个异常，这种异常
有可能出现在我们访问数据库过程中出现：

```typescript
// src/routes/index.ts
router.get("/async-error", async (req, res) => {
  function _getUserFromDb() {
    return new Promise(() => {
      throw new Error("this is an error");
    });
  }

  const data = await _getUserFromDb();
  return res.json({ user: data }).end();
});
```

当我们访问 `/async-error` 时，可以看到以下异常信息：

```sh
(node:21168) UnhandledPromiseRejectionWarning: Error: this is an error
```

这是我们对于 Promise Rejection 异常没有进行处理。正确的做法是在外面套一层 `try/catch`，同时使用 `next(error)` 将异常交由 `Express` 异常中间件进行处理：

```typescript
// src/routes/index.ts
router.get("/async-error", async (req, res, next) => {
  function _getUserFromDb() {
    return new Promise(() => {
      throw new Error("this is an error");
    });
  }

  try {
    const data = await _getUserFromDb();
    return res.json({ user: data }).end();
  } catch (err) {
    next(err);
  }
});
```

但是，这种异常处理方式非常繁琐，对于当个请求还好处理，一旦请求多了，对于每一个请求都
写 `try/catch` 显然太不实际。

当然，我们可以借助第三方异常处理中间件，帮我们 `catch` 住异步异常，这里采用
`express-async-errors`。

我们还是先安装依赖：

```sh
yarn add express-async-errors
```

改造以下我们的异步请求：

```typescript
// src/routes/index.ts
import express from "express";
import "express-async-errors";
export const router = express();

router.get("/async-error", async (req, res, next) => {
  function _getUserFromDb() {
    return new Promise(() => {
      throw new Error("this is an error");
    });
  }

  // 👇：不再使用 try catch
  const data = await _getUserFromDb();
  return res.json({ user: data }).end();
});
```

再次访问可以看到的异常信息就已经发生改变了，不再是 `UnhandledPromiseRejectionWarning`：

```sh
Error: this is an error
```

其实，`express-async-errors` 是带有副作用的函数，它帮我们对
`Express Router` 进行加工，也就是对 `Promise` 异常进行封装处理，
可以简要看一下它的源码：

```javascript
// express-async-errors

function wrap(fn) {
  const newFn = function newFn(...args) {
    // 获取到 handler 函数。
    const ret = fn.apply(this, args);
    const next = (args.length === 5 ? args[2] : last(args)) || noop;
    // 检查执行结果是否是一个 Promise，并对 Promise 异常进行处理。
    if (ret && ret.catch) ret.catch((err) => next(err));
    return ret;
  };
  Object.defineProperty(newFn, "length", {
    value: fn.length,
    writable: false,
  });
  return copyFnProps(fn, newFn);
}
```

到目前以为，我们已经掌握 `Express` 对于同步异常和异步异常的处理。
但是还有一些异常是超出 `Express` 的管理范围的，下面我们继续展开讨论。

## 处理未捕获异常

在讨论这部分内容之前，我们先注释之前导入的 `express-async-errors`。

```typescript
// src/routes/index.ts
import express from "express";
// import 'express-async-errors'
```

考虑如下情景：

```typescript
// src/routes/index.ts
router.get("/rejection-error", (req, res) => {
  function _getUserFromDb() {
    return new Promise(() => {
      throw new Error("this is an error");
    });
  }

  return _getUserFromDb().then((user) => {
    res.json({
      user,
    });
  });
});
```

和之前的结果一样，当我们访问 `/rejection-error` 时，控制台会抛出 `UnhandledPromiseRejectionWarning`。
我们可以在 `Node` 注册全局的处理函数来捕获此类异常：

```typescript
// src/process.ts
process.on("unhandledRejection", (reason: Error) => {
  console.log("on unhandledRejection: ", reason);
  throw new Error(reason?.message ?? reason);
});

// src/index.ts
import express from "express";
import { router } from "./routes";
import "./process";
```

我们可以在监听函数中捕获 Rejection 异常，并进行适当的处理（这里直接往下抛）。
当我们访问 `/rejection-error` 我们可以在控制台看下如下信息 👇；

```sh
on unhandledRejection:  Error: this is an error
...
```

同样的道理，我们也可以捕获 `uncaughtException`：

```typescript
// src/process.ts
process.on("uncaughtException", (error) => {
  console.log("on uncaughtException: ", error);
  errorHandler.handleError(error);
});

// src/exceptions/error-handler.ts
export const errorHandler = {
  handleError(error: unknown) {
    console.log("errorHandler handleError: ", error);
  },
};
```

我们将异常交由一个错误处理器处理，后续我们会完善这一部分的代码。

## 自定义异常处理中间件

为了覆盖 `Express` 提供的默认错误处理中间件，我们需要自行提供错误处理中间件。不同于其他中间件，错误处理中间件
需要提供 4 个参数 `err, req, res, next`，参考下面的示例：

```typescript
// src/routes/index.ts
import express, { NextFunction, Request, Response } from "express";
// import 'express-async-errors'
export const router = express();

// routes...

router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.log("handler error...");
});
```

访问之前会出错的路由，我们可以在终端看到如下的输出，说明错误处理中间件生效：

```sh
handler error...
```

事实上，我们还可以通过 `next(err)` 将错误继续往下抛，交由后面的中间件进行处理：

```typescript
const logger = {
  log(err: Error) {
    console.log(`logger: `, err);
  },
};

const messageLogger = {
  sendErrorMessage(err: Error) {
    console.log("sendErrorMessage: ", err);
  },
};

router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // 日志记录
  logger.log(err);
  next(err);
});

router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // 发送通知信息
  messageLogger.sendErrorMessage(err);
  next(err);
});

router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // 异常处理
  errorHandler.handleError(err);
});
```

我们可以在最后再对异常进行处理，在传递的过程中我们可以记录日志，又或者发送通知。

## 自定义异常处理

为了实现对不同区分对待，我们自定义异常处理对象。对于网络请求我们通常会携带 HTTP 状态码在创建自定义异常类之前
我们先安装所需要的依赖：

```sh
yarn add http-status-codes
yarn add @types/http-status-codes -D
```

接下来我们创建自定义异常类：

```typescript
// src/exceptions/app-error.ts
import { StatusCodes } from "http-status-codes";

interface AppErrorArgs {
  name?: string;
  httpCode: StatusCodes;
  message: string;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly name: string;
  public readonly httpCode: StatusCodes;
  // 是否为严重错误
  public readonly isOperational: boolean = true;

  constructor(args: AppErrorArgs) {
    super(args.message);

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = args.name || this.constructor.name;
    this.httpCode = args.httpCode;
    if (args.isOperational !== undefined) {
      this.isOperational = args.isOperational;
    }

    Error.captureStackTrace(this);
  }
}
```

## 异常处理

接下来我们就可以对异常进行处理：

```typescript
// src/exceptions/error-handler.ts

import { Response } from "express";
import { AppError } from "./app-error";

class ErrorHandler {
  private isTrustedError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }

    return false;
  }

  public handleError(err: Error | AppError, res?: Response) {}
}

export const errorHandler = new ErrorHandler();
```

我们用 `isOperational` 作为可信赖异常的判断依据，对于可信赖的异常我们
额外进行处理，其他异常我们视为服务器异常处理，于是 `handleError` 实现如下：

```typescript
class ErrorHandler {
  // ...
  public handleError(err: Error | AppError, res?: Response) {
    if (err instanceof AppError && res) {
      this.handleTrustedError(err, res);
    } else {
      this.handleCriticalError(err, res);
    }
  }

  private handleTrustedError(err: AppError, res: Response) {
    res.status(err.httpCode).json({
      message: err.message,
    });
  }

  private handleCriticalError(err: Error | AppError, res?: Response) {
    if (res) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Internal server error",
      });
    }
    console.log("Server error with: ", err);
    process.exit(1);
  }
}
```

可信赖的异常是由我们通过 `Expression` 抛出来的，所以我们可以用 `Response`
进行统一处理。而不可信赖的异常可能出现在其他不被 `Express` 所捕获的异常，对此我们需要
判断传入的 `Response` 是否有值。

## 总结

以上就是如何在 `Express` 中对于异常的统一处理。

- 同步异常 `Express` 会帮我们捕获。
- 异步异常可以借助像 `express-async-errors` 捕获。
- 我们可以自定义异常类，针对不同异常进行处理。
- 我们可以通过覆盖 `Express` 处理中间件，自定义异常处理。
- 监听全局未捕获的异常，确保程序的健壮。

## 参考文章

- [How to Handle Errors in Express with TypeScript](https://www.codeconcisely.com/posts/how-to-handle-errors-in-express-with-typescript/)
- [Custom errors, extending Error](https://javascript.info/custom-errors)
