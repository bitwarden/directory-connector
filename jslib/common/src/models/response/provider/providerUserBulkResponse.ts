import { BaseResponse } from "../baseResponse";

export class ProviderUserBulkResponse extends BaseResponse {
  id: string;
  error: string;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.error = this.getResponseProperty("Error");
  }
}
