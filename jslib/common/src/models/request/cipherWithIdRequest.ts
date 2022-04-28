import { Cipher } from "../domain/cipher";

import { CipherRequest } from "./cipherRequest";

export class CipherWithIdRequest extends CipherRequest {
  id: string;

  constructor(cipher: Cipher) {
    super(cipher);
    this.id = cipher.id;
  }
}
