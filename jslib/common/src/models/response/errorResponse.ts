import { Utils } from "../../misc/utils";

import { BaseResponse } from "./baseResponse";

export class ErrorResponse extends BaseResponse {
  message: string;
  validationErrors: { [key: string]: string[] };
  statusCode: number;
  captchaRequired: boolean;
  captchaSiteKey: string;

  constructor(response: any, status: number, identityResponse?: boolean) {
    super(response);
    let errorModel = null;
    if (response != null) {
      const responseErrorModel = this.getResponseProperty("ErrorModel");
      if (responseErrorModel && identityResponse) {
        errorModel = responseErrorModel;
      } else {
        errorModel = response;
      }
    }

    if (errorModel) {
      this.message = this.getResponseProperty("Message", errorModel);
      this.validationErrors = this.getResponseProperty("ValidationErrors", errorModel);
      this.captchaSiteKey = this.validationErrors?.HCaptcha_SiteKey?.[0];
      this.captchaRequired = !Utils.isNullOrWhitespace(this.captchaSiteKey);
    } else {
      if (status === 429) {
        this.message = "Rate limit exceeded. Try again later.";
      }
    }
    this.statusCode = status;
  }

  getSingleMessage(): string {
    if (this.validationErrors == null) {
      return this.message;
    }
    for (const key in this.validationErrors) {
      // eslint-disable-next-line
      if (!this.validationErrors.hasOwnProperty(key)) {
        continue;
      }
      if (this.validationErrors[key].length) {
        return this.validationErrors[key][0];
      }
    }
    return this.message;
  }

  getAllMessages(): string[] {
    const messages: string[] = [];
    if (this.validationErrors == null) {
      return messages;
    }
    for (const key in this.validationErrors) {
      // eslint-disable-next-line
      if (!this.validationErrors.hasOwnProperty(key)) {
        continue;
      }
      this.validationErrors[key].forEach((item: string) => {
        let prefix = "";
        if (key.indexOf("[") > -1 && key.indexOf("]") > -1) {
          const lastSep = key.lastIndexOf(".");
          prefix = key.substr(0, lastSep > -1 ? lastSep : key.length) + ": ";
        }
        messages.push(prefix + item);
      });
    }
    return messages;
  }
}
