import { Cipher } from "../domain/cipher";

import { CipherRequest } from "./cipherRequest";

export class CipherShareRequest {
  cipher: CipherRequest;
  collectionIds: string[];

  constructor(cipher: Cipher) {
    this.cipher = new CipherRequest(cipher);
    this.collectionIds = cipher.collectionIds;
  }
}
