import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "./app-error";

class ErrorHandler {
  private isTrustedError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }

    return false;
  }

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

export const errorHandler = new ErrorHandler();
