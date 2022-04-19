import { BaseResponse } from "./baseResponse";

export class ListResponse<T> extends BaseResponse {
  data: T[];
  continuationToken: string;

  constructor(response: any, t: new (dataResponse: any) => T) {
    super(response);
    const data = this.getResponseProperty("Data");
    this.data = data == null ? [] : data.map((dr: any) => new t(dr));
    this.continuationToken = this.getResponseProperty("ContinuationToken");
  }
}
