import { errorHandler } from "./exceptions/error-handler";

process.on("unhandledRejection", (reason: Error) => {
  console.log("on unhandledRejection: ", reason);
  throw new Error(reason?.message ?? reason);
});

process.on("uncaughtException", (error) => {
  console.log("on uncaughtException: ", error);
  errorHandler.handleError(error);
});
