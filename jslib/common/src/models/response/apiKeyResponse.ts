import { BaseResponse } from "./baseResponse";

export class ApiKeyResponse extends BaseResponse {
  apiKey: string;

  constructor(response: any) {
    super(response);
    this.apiKey = this.getResponseProperty("ApiKey");
  }
}
