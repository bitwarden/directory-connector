import { FileUploadType } from "../../enums/fileUploadType";

import { BaseResponse } from "./baseResponse";
import { CipherResponse } from "./cipherResponse";

export class AttachmentUploadDataResponse extends BaseResponse {
  attachmentId: string;
  fileUploadType: FileUploadType;
  cipherResponse: CipherResponse;
  cipherMiniResponse: CipherResponse;
  url: string = null;
  constructor(response: any) {
    super(response);
    this.attachmentId = this.getResponseProperty("AttachmentId");
    this.fileUploadType = this.getResponseProperty("FileUploadType");
    const cipherResponse = this.getResponseProperty("CipherResponse");
    const cipherMiniResponse = this.getResponseProperty("CipherMiniResponse");
    this.cipherResponse = cipherResponse == null ? null : new CipherResponse(cipherResponse);
    this.cipherMiniResponse =
      cipherMiniResponse == null ? null : new CipherResponse(cipherMiniResponse);
    this.url = this.getResponseProperty("Url");
  }
}
