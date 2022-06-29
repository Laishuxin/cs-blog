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
