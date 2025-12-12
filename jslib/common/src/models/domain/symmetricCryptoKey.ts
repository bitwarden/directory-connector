import { EncryptionType } from "../../enums/encryptionType";
import Utils from "../../misc/utils";

export class SymmetricCryptoKey {
  key: ArrayBuffer;
  encKey?: ArrayBuffer;
  macKey?: ArrayBuffer;
  encType: EncryptionType;

  keyB64: string;
  encKeyB64: string;
  macKeyB64: string;

  meta: any;

  constructor(key: BufferSource, encType?: EncryptionType) {
    if (key == null) {
      throw new Error("Must provide key");
    }

    const keyBuffer = ArrayBuffer.isView(key) ? key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) : key;

    if (encType == null) {
      if (keyBuffer.byteLength === 32) {
        encType = EncryptionType.AesCbc256_B64;
      } else if (keyBuffer.byteLength === 64) {
        encType = EncryptionType.AesCbc256_HmacSha256_B64;
      } else {
        throw new Error("Unable to determine encType.");
      }
    }

    this.key = keyBuffer;
    this.encType = encType;

    if (encType === EncryptionType.AesCbc256_B64 && keyBuffer.byteLength === 32) {
      this.encKey = keyBuffer;
      this.macKey = null;
    } else if (encType === EncryptionType.AesCbc128_HmacSha256_B64 && keyBuffer.byteLength === 32) {
      this.encKey = keyBuffer.slice(0, 16);
      this.macKey = keyBuffer.slice(16, 32);
    } else if (encType === EncryptionType.AesCbc256_HmacSha256_B64 && keyBuffer.byteLength === 64) {
      this.encKey = keyBuffer.slice(0, 32);
      this.macKey = keyBuffer.slice(32, 64);
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
