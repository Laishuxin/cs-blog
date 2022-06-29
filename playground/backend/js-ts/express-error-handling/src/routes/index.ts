import express, { NextFunction, Request, Response } from "express";
import { errorHandler } from "../exceptions/error-handler";
// import 'express-async-errors'
export const router = express();

router.get("/", (req, res) => {
  throw new Error("this is an error");
  res.json({ message: "ok" });
});

router.get("/async-error", async (req, res, next) => {
  function _getUserFromDb() {
    return new Promise(() => {
      throw new Error("this is an error");
    });
  }

  const data = await _getUserFromDb();
  return res.json({ user: data }).end();
});

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
  errorHandler.handleError(err, res);
});
