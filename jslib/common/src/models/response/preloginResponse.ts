import { KdfType } from "../../enums/kdfType";

import { BaseResponse } from "./baseResponse";

export class PreloginResponse extends BaseResponse {
  kdf: KdfType;
  kdfIterations: number;

  constructor(response: any) {
    super(response);
    this.kdf = this.getResponseProperty("Kdf");
    this.kdfIterations = this.getResponseProperty("KdfIterations");
  }
}
