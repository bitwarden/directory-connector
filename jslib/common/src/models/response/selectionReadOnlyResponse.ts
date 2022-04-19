import { BaseResponse } from "./baseResponse";

export class SelectionReadOnlyResponse extends BaseResponse {
  id: string;
  readOnly: boolean;
  hidePasswords: boolean;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.readOnly = this.getResponseProperty("ReadOnly");
    this.hidePasswords = this.getResponseProperty("HidePasswords");
  }
}
