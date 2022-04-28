import { BaseResponse } from "./baseResponse";

export class FolderResponse extends BaseResponse {
  id: string;
  name: string;
  revisionDate: string;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.name = this.getResponseProperty("Name");
    this.revisionDate = this.getResponseProperty("RevisionDate");
  }
}
