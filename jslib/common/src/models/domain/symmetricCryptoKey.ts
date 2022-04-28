import { EncryptionType } from "../../enums/encryptionType";
import { Utils } from "../../misc/utils";

export class SymmetricCryptoKey {
  key: ArrayBuffer;
  encKey?: ArrayBuffer;
  macKey?: ArrayBuffer;
  encType: EncryptionType;

  keyB64: string;
  encKeyB64: string;
  macKeyB64: string;

  meta: any;

  constructor(key: ArrayBuffer, encType?: EncryptionType) {
    if (key == null) {
      throw new Error("Must provide key");
    }

    if (encType == null) {
      if (key.byteLength === 32) {
        encType = EncryptionType.AesCbc256_B64;
      } else if (key.byteLength === 64) {
        encType = EncryptionType.AesCbc256_HmacSha256_B64;
      } else {
        throw new Error("Unable to determine encType.");
      }
    }

    this.key = key;
    this.encType = encType;

    if (encType === EncryptionType.AesCbc256_B64 && key.byteLength === 32) {
      this.encKey = key;
      this.macKey = null;
    } else if (encType === EncryptionType.AesCbc128_HmacSha256_B64 && key.byteLength === 32) {
      this.encKey = key.slice(0, 16);
      this.macKey = key.slice(16, 32);
    } else if (encType === EncryptionType.AesCbc256_HmacSha256_B64 && key.byteLength === 64) {
      this.encKey = key.slice(0, 32);
      this.macKey = key.slice(32, 64);
    } else {
      throw new Error("Unsupported encType/key length.");
    }

    if (this.key != null) {
      this.keyB64 = Utils.fromBufferToB64(this.key);
    }
    if (this.encKey != null) {
      this.encKeyB64 = Utils.fromBufferToB64(this.encKey);
    }
    if (this.macKey != null) {
      this.macKeyB64 = Utils.fromBufferToB64(this.macKey);
    }
  }
}
