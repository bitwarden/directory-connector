import { SendType } from "../../enums/sendType";
import { SendFileApi } from "../api/sendFileApi";
import { SendTextApi } from "../api/sendTextApi";

import { BaseResponse } from "./baseResponse";

export class SendAccessResponse extends BaseResponse {
  id: string;
  type: SendType;
  name: string;
  file: SendFileApi;
  text: SendTextApi;
  expirationDate: Date;
  creatorIdentifier: string;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.type = this.getResponseProperty("Type");
    this.name = this.getResponseProperty("Name");

    const text = this.getResponseProperty("Text");
    if (text != null) {
      this.text = new SendTextApi(text);
    }

    const file = this.getResponseProperty("File");
    if (file != null) {
      this.file = new SendFileApi(file);
    }

    this.expirationDate = this.getResponseProperty("ExpirationDate");
    this.creatorIdentifier = this.getResponseProperty("CreatorIdentifier");
  }
}
