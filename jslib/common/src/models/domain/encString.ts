import { CryptoService } from "../../abstractions/crypto.service";
import { EncryptionType } from "../../enums/encryptionType";
import { Utils } from "../../misc/utils";

import { SymmetricCryptoKey } from "./symmetricCryptoKey";

export class EncString {
  encryptedString?: string;
  encryptionType?: EncryptionType;
  decryptedValue?: string;
  data?: string;
  iv?: string;
  mac?: string;

  constructor(
    encryptedStringOrType: string | EncryptionType,
    data?: string,
    iv?: string,
    mac?: string
  ) {
    if (data != null) {
      // data and header
      const encType = encryptedStringOrType as EncryptionType;

      if (iv != null) {
        this.encryptedString = encType + "." + iv + "|" + data;
      } else {
        this.encryptedString = encType + "." + data;
      }

      // mac
      if (mac != null) {
        this.encryptedString += "|" + mac;
      }

      this.encryptionType = encType;
      this.data = data;
      this.iv = iv;
      this.mac = mac;

      return;
    }

    this.encryptedString = encryptedStringOrType as string;
    if (!this.encryptedString) {
      return;
    }

    const headerPieces = this.encryptedString.split(".");
    let encPieces: string[] = null;

    if (headerPieces.length === 2) {
      try {
        this.encryptionType = parseInt(headerPieces[0], null);
        encPieces = headerPieces[1].split("|");
      } catch (e) {
        return;
      }
    } else {
      encPieces = this.encryptedString.split("|");
      this.encryptionType =
        encPieces.length === 3
          ? EncryptionType.AesCbc128_HmacSha256_B64
          : EncryptionType.AesCbc256_B64;
    }

    switch (this.encryptionType) {
      case EncryptionType.AesCbc128_HmacSha256_B64:
      case EncryptionType.AesCbc256_HmacSha256_B64:
        if (encPieces.length !== 3) {
          return;
        }

        this.iv = encPieces[0];
        this.data = encPieces[1];
        this.mac = encPieces[2];
        break;
      case EncryptionType.AesCbc256_B64:
        if (encPieces.length !== 2) {
          return;
        }

        this.iv = encPieces[0];
        this.data = encPieces[1];
        break;
      case EncryptionType.Rsa2048_OaepSha256_B64:
      case EncryptionType.Rsa2048_OaepSha1_B64:
        if (encPieces.length !== 1) {
          return;
        }

        this.data = encPieces[0];
        break;
      default:
        return;
    }
  }

  async decrypt(orgId: string, key: SymmetricCryptoKey = null): Promise<string> {
    if (this.decryptedValue != null) {
      return this.decryptedValue;
    }

    let cryptoService: CryptoService;
    const containerService = (Utils.global as any).bitwardenContainerService;
    if (containerService) {
      cryptoService = containerService.getCryptoService();
    } else {
      throw new Error("global bitwardenContainerService not initialized.");
    }

    try {
      if (key == null) {
        key = await cryptoService.getOrgKey(orgId);
      }
      this.decryptedValue = await cryptoService.decryptToUtf8(this, key);
    } catch (e) {
      this.decryptedValue = "[error: cannot decrypt]";
    }
    return this.decryptedValue;
  }
}
