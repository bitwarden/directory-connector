import { SendType } from "../../enums/sendType";
import { SendResponse } from "../response/sendResponse";

import { SendFileData } from "./sendFileData";
import { SendTextData } from "./sendTextData";

export class SendData {
  id: string;
  accessId: string;
  userId: string;
  type: SendType;
  name: string;
  notes: string;
  file: SendFileData;
  text: SendTextData;
  key: string;
  maxAccessCount?: number;
  accessCount: number;
  revisionDate: string;
  expirationDate: string;
  deletionDate: string;
  password: string;
  disabled: boolean;
  hideEmail: boolean;

  constructor(response?: SendResponse, userId?: string) {
    if (response == null) {
      return;
    }

    this.id = response.id;
    this.accessId = response.accessId;
    this.userId = userId;
    this.type = response.type;
    this.name = response.name;
    this.notes = response.notes;
    this.key = response.key;
    this.maxAccessCount = response.maxAccessCount;
    this.accessCount = response.accessCount;
    this.revisionDate = response.revisionDate;
    this.expirationDate = response.expirationDate;
    this.deletionDate = response.deletionDate;
    this.password = response.password;
    this.disabled = response.disable;
    this.hideEmail = response.hideEmail;

    switch (this.type) {
      case SendType.Text:
        this.text = new SendTextData(response.text);
        break;
      case SendType.File:
        this.file = new SendFileData(response.file);
        break;
      default:
        break;
    }
  }
}
