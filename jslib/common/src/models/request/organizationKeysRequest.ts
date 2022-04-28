import { KeysRequest } from "./keysRequest";

export class OrganizationKeysRequest extends KeysRequest {
  constructor(publicKey: string, encryptedPrivateKey: string) {
    super(publicKey, encryptedPrivateKey);
  }
}
