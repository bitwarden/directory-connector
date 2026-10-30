import { BaseResponse } from "./response/baseResponse";

export class Response {
  static error(error: any, data?: any): Response {
    const res = new Response();
    res.success = false;
    if (typeof error === "string") {
      res.message = error;
    } else {
      if (error.message != null) {
        res.message = error.message;
        if (error.cause != null) {
          res.message = `${error.message} (${String(error.cause)})`;
        }
      } else if (error.toString() === "[object Object]") {
        res.message = JSON.stringify(error);
      } else {
        res.message = error.toString();
      }
    }
    res.data = data;
    return res;
  }

  static notFound(): Response {
    return Response.error("Not found.");
  }

  static badRequest(message: string): Response {
    return Response.error(message);
  }

  static multipleResults(ids: string[]): Response {
    let msg =
      "More than one result was found. Try getting a specific object by `id` instead. " +
      "The following objects were found:";
    ids.forEach((id) => {
      msg += "\n" + id;
    });
    return Response.error(msg, ids);
  }

  static success(data?: BaseResponse): Response {
    const res = new Response();
    res.success = true;
    res.data = data;
    return res;
  }

  success: boolean;
  message: string;
  errorCode: number;
  data: BaseResponse;
}
