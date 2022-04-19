import { EmergencyAccessStatusType } from "../../enums/emergencyAccessStatusType";
import { EmergencyAccessType } from "../../enums/emergencyAccessType";
import { KdfType } from "../../enums/kdfType";

import { BaseResponse } from "./baseResponse";
import { CipherResponse } from "./cipherResponse";

export class EmergencyAccessGranteeDetailsResponse extends BaseResponse {
  id: string;
  granteeId: string;
  name: string;
  email: string;
  type: EmergencyAccessType;
  status: EmergencyAccessStatusType;
  waitTimeDays: number;
  creationDate: string;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.granteeId = this.getResponseProperty("GranteeId");
    this.name = this.getResponseProperty("Name");
    this.email = this.getResponseProperty("Email");
    this.type = this.getResponseProperty("Type");
    this.status = this.getResponseProperty("Status");
    this.waitTimeDays = this.getResponseProperty("WaitTimeDays");
    this.creationDate = this.getResponseProperty("CreationDate");
  }
}

export class EmergencyAccessGrantorDetailsResponse extends BaseResponse {
  id: string;
  grantorId: string;
  name: string;
  email: string;
  type: EmergencyAccessType;
  status: EmergencyAccessStatusType;
  waitTimeDays: number;
  creationDate: string;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.grantorId = this.getResponseProperty("GrantorId");
    this.name = this.getResponseProperty("Name");
    this.email = this.getResponseProperty("Email");
    this.type = this.getResponseProperty("Type");
    this.status = this.getResponseProperty("Status");
    this.waitTimeDays = this.getResponseProperty("WaitTimeDays");
    this.creationDate = this.getResponseProperty("CreationDate");
  }
}

export class EmergencyAccessTakeoverResponse extends BaseResponse {
  keyEncrypted: string;
  kdf: KdfType;
  kdfIterations: number;

  constructor(response: any) {
    super(response);

    this.keyEncrypted = this.getResponseProperty("KeyEncrypted");
    this.kdf = this.getResponseProperty("Kdf");
    this.kdfIterations = this.getResponseProperty("KdfIterations");
  }
}

export class EmergencyAccessViewResponse extends BaseResponse {
  keyEncrypted: string;
  ciphers: CipherResponse[] = [];

  constructor(response: any) {
    super(response);

    this.keyEncrypted = this.getResponseProperty("KeyEncrypted");

    const ciphers = this.getResponseProperty("Ciphers");
    if (ciphers != null) {
      this.ciphers = ciphers.map((c: any) => new CipherResponse(c));
    }
  }
}
