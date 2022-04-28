import { DecryptParameters } from "../models/domain/decryptParameters";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";

export abstract class CryptoFunctionService {
  pbkdf2: (
    password: string | ArrayBuffer,
    salt: string | ArrayBuffer,
    algorithm: "sha256" | "sha512",
    iterations: number
  ) => Promise<ArrayBuffer>;
  hkdf: (
    ikm: ArrayBuffer,
    salt: string | ArrayBuffer,
    info: string | ArrayBuffer,
    outputByteSize: number,
    algorithm: "sha256" | "sha512"
  ) => Promise<ArrayBuffer>;
  hkdfExpand: (
    prk: ArrayBuffer,
    info: string | ArrayBuffer,
    outputByteSize: number,
    algorithm: "sha256" | "sha512"
  ) => Promise<ArrayBuffer>;
  hash: (
    value: string | ArrayBuffer,
    algorithm: "sha1" | "sha256" | "sha512" | "md5"
  ) => Promise<ArrayBuffer>;
  hmac: (
    value: ArrayBuffer,
    key: ArrayBuffer,
    algorithm: "sha1" | "sha256" | "sha512"
  ) => Promise<ArrayBuffer>;
  compare: (a: ArrayBuffer, b: ArrayBuffer) => Promise<boolean>;
  hmacFast: (
    value: ArrayBuffer | string,
    key: ArrayBuffer | string,
    algorithm: "sha1" | "sha256" | "sha512"
  ) => Promise<ArrayBuffer | string>;
  compareFast: (a: ArrayBuffer | string, b: ArrayBuffer | string) => Promise<boolean>;
  aesEncrypt: (data: ArrayBuffer, iv: ArrayBuffer, key: ArrayBuffer) => Promise<ArrayBuffer>;
  aesDecryptFastParameters: (
    data: string,
    iv: string,
    mac: string,
    key: SymmetricCryptoKey
  ) => DecryptParameters<ArrayBuffer | string>;
  aesDecryptFast: (parameters: DecryptParameters<ArrayBuffer | string>) => Promise<string>;
  aesDecrypt: (data: ArrayBuffer, iv: ArrayBuffer, key: ArrayBuffer) => Promise<ArrayBuffer>;
  rsaEncrypt: (
    data: ArrayBuffer,
    publicKey: ArrayBuffer,
    algorithm: "sha1" | "sha256"
  ) => Promise<ArrayBuffer>;
  rsaDecrypt: (
    data: ArrayBuffer,
    privateKey: ArrayBuffer,
    algorithm: "sha1" | "sha256"
  ) => Promise<ArrayBuffer>;
  rsaExtractPublicKey: (privateKey: ArrayBuffer) => Promise<ArrayBuffer>;
  rsaGenerateKeyPair: (length: 1024 | 2048 | 4096) => Promise<[ArrayBuffer, ArrayBuffer]>;
  randomBytes: (length: number) => Promise<ArrayBuffer>;
}
