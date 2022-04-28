import { KdfType } from "../../enums/kdfType";

import { CaptchaProtectedRequest } from "./captchaProtectedRequest";
import { KeysRequest } from "./keysRequest";
import { ReferenceEventRequest } from "./referenceEventRequest";

export class RegisterRequest implements CaptchaProtectedRequest {
  masterPasswordHint: string;
  keys: KeysRequest;
  token: string;
  organizationUserId: string;

  constructor(
    public email: string,
    public name: string,
    public masterPasswordHash: string,
    masterPasswordHint: string,
    public key: string,
    public kdf: KdfType,
    public kdfIterations: number,
    public referenceData: ReferenceEventRequest,
    public captchaResponse: string
  ) {
    this.masterPasswordHint = masterPasswordHint ? masterPasswordHint : null;
  }
}
