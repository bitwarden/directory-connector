import { KdfType } from "../../../enums/kdfType";
import { KeysRequest } from "../keysRequest";

export class SetKeyConnectorKeyRequest {
  key: string;
  keys: KeysRequest;
  kdf: KdfType;
  kdfIterations: number;
  orgIdentifier: string;

  constructor(
    key: string,
    kdf: KdfType,
    kdfIterations: number,
    orgIdentifier: string,
    keys: KeysRequest
  ) {
    this.key = key;
    this.kdf = kdf;
    this.kdfIterations = kdfIterations;
    this.orgIdentifier = orgIdentifier;
    this.keys = keys;
  }
}
