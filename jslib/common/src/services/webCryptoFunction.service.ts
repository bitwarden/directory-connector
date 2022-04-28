import * as forge from "node-forge";

import { CryptoFunctionService } from "../abstractions/cryptoFunction.service";
import { Utils } from "../misc/utils";
import { DecryptParameters } from "../models/domain/decryptParameters";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";

export class WebCryptoFunctionService implements CryptoFunctionService {
  private crypto: Crypto;
  private subtle: SubtleCrypto;

  constructor(win: Window) {
    this.crypto = typeof win.crypto !== "undefined" ? win.crypto : null;
    this.subtle =
      !!this.crypto && typeof win.crypto.subtle !== "undefined" ? win.crypto.subtle : null;
  }

  async pbkdf2(
    password: string | ArrayBuffer,
    salt: string | ArrayBuffer,
    algorithm: "sha256" | "sha512",
    iterations: number
  ): Promise<ArrayBuffer> {
    const wcLen = algorithm === "sha256" ? 256 : 512;
    const passwordBuf = this.toBuf(password);
    const saltBuf = this.toBuf(salt);

    const pbkdf2Params: Pbkdf2Params = {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: iterations,
      hash: { name: this.toWebCryptoAlgorithm(algorithm) },
    };

    const impKey = await this.subtle.importKey(
      "raw",
      passwordBuf,
      { name: "PBKDF2" } as any,
      false,
      ["deriveBits"]
    );
    return await this.subtle.deriveBits(pbkdf2Params, impKey, wcLen);
  }

  async hkdf(
    ikm: ArrayBuffer,
    salt: string | ArrayBuffer,
    info: string | ArrayBuffer,
    outputByteSize: number,
    algorithm: "sha256" | "sha512"
  ): Promise<ArrayBuffer> {
    const saltBuf = this.toBuf(salt);
    const infoBuf = this.toBuf(info);

    const hkdfParams: HkdfParams = {
      name: "HKDF",
      salt: saltBuf,
      info: infoBuf,
      hash: { name: this.toWebCryptoAlgorithm(algorithm) },
    };

    const impKey = await this.subtle.importKey("raw", ikm, { name: "HKDF" } as any, false, [
      "deriveBits",
    ]);
    return await this.subtle.deriveBits(hkdfParams as any, impKey, outputByteSize * 8);
  }

  // ref: https://tools.ietf.org/html/rfc5869
  async hkdfExpand(
    prk: ArrayBuffer,
    info: string | ArrayBuffer,
    outputByteSize: number,
    algorithm: "sha256" | "sha512"
  ): Promise<ArrayBuffer> {
    const hashLen = algorithm === "sha256" ? 32 : 64;
    if (outputByteSize > 255 * hashLen) {
      throw new Error("outputByteSize is too large.");
    }
    const prkArr = new Uint8Array(prk);
    if (prkArr.length < hashLen) {
      throw new Error("prk is too small.");
    }
    const infoBuf = this.toBuf(info);
    const infoArr = new Uint8Array(infoBuf);
    let runningOkmLength = 0;
    let previousT = new Uint8Array(0);
    const n = Math.ceil(outputByteSize / hashLen);
    const okm = new Uint8Array(n * hashLen);
    for (let i = 0; i < n; i++) {
      const t = new Uint8Array(previousT.length + infoArr.length + 1);
      t.set(previousT);
      t.set(infoArr, previousT.length);
      t.set([i + 1], t.length - 1);
      previousT = new Uint8Array(await this.hmac(t.buffer, prk, algorithm));
      okm.set(previousT, runningOkmLength);
      runningOkmLength += previousT.length;
      if (runningOkmLength >= outputByteSize) {
        break;
      }
    }
    return okm.slice(0, outputByteSize).buffer;
  }

  async hash(
    value: string | ArrayBuffer,
    algorithm: "sha1" | "sha256" | "sha512" | "md5"
  ): Promise<ArrayBuffer> {
    if (algorithm === "md5") {
      const md = algorithm === "md5" ? forge.md.md5.create() : forge.md.sha1.create();
      const valueBytes = this.toByteString(value);
      md.update(valueBytes, "raw");
      return Utils.fromByteStringToArray(md.digest().data).buffer;
    }

    const valueBuf = this.toBuf(value);
    return await this.subtle.digest({ name: this.toWebCryptoAlgorithm(algorithm) }, valueBuf);
  }

  async hmac(
    value: ArrayBuffer,
    key: ArrayBuffer,
    algorithm: "sha1" | "sha256" | "sha512"
  ): Promise<ArrayBuffer> {
    const signingAlgorithm = {
      name: "HMAC",
      hash: { name: this.toWebCryptoAlgorithm(algorithm) },
    };

    const impKey = await this.subtle.importKey("raw", key, signingAlgorithm, false, ["sign"]);
    return await this.subtle.sign(signingAlgorithm, impKey, value);
  }

  // Safely compare two values in a way that protects against timing attacks (Double HMAC Verification).
  // ref: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2011/february/double-hmac-verification/
  // ref: https://paragonie.com/blog/2015/11/preventing-timing-attacks-on-string-comparison-with-double-hmac-strategy
  async compare(a: ArrayBuffer, b: ArrayBuffer): Promise<boolean> {
    const macKey = await this.randomBytes(32);
    const signingAlgorithm = {
      name: "HMAC",
      hash: { name: "SHA-256" },
    };
    const impKey = await this.subtle.importKey("raw", macKey, signingAlgorithm, false, ["sign"]);
    const mac1 = await this.subtle.sign(signingAlgorithm, impKey, a);
    const mac2 = await this.subtle.sign(signingAlgorithm, impKey, b);

    if (mac1.byteLength !== mac2.byteLength) {
      return false;
    }

    const arr1 = new Uint8Array(mac1);
    const arr2 = new Uint8Array(mac2);
    for (let i = 0; i < arr2.length; i++) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }

    return true;
  }

  hmacFast(value: string, key: string, algorithm: "sha1" | "sha256" | "sha512"): Promise<string> {
    const hmac = forge.hmac.create();
    hmac.start(algorithm, key);
    hmac.update(value);
    const bytes = hmac.digest().getBytes();
    return Promise.resolve(bytes);
  }

  async compareFast(a: string, b: string): Promise<boolean> {
    const rand = await this.randomBytes(32);
    const bytes = new Uint32Array(rand);
    const buffer = forge.util.createBuffer();
    for (let i = 0; i < bytes.length; i++) {
      buffer.putInt32(bytes[i]);
    }
    const macKey = buffer.getBytes();

    const hmac = forge.hmac.create();
    hmac.start("sha256", macKey);
    hmac.update(a);
    const mac1 = hmac.digest().getBytes();

    hmac.start(null, null);
    hmac.update(b);
    const mac2 = hmac.digest().getBytes();

    const equals = mac1 === mac2;
    return equals;
  }

  async aesEncrypt(data: ArrayBuffer, iv: ArrayBuffer, key: ArrayBuffer): Promise<ArrayBuffer> {
    const impKey = await this.subtle.importKey("raw", key, { name: "AES-CBC" } as any, false, [
      "encrypt",
    ]);
    return await this.subtle.encrypt({ name: "AES-CBC", iv: iv }, impKey, data);
  }

  aesDecryptFastParameters(
    data: string,
    iv: string,
    mac: string,
    key: SymmetricCryptoKey
  ): DecryptParameters<string> {
    const p = new DecryptParameters<string>();
    if (key.meta != null) {
      p.encKey = key.meta.encKeyByteString;
      p.macKey = key.meta.macKeyByteString;
    }

    if (p.encKey == null) {
      p.encKey = forge.util.decode64(key.encKeyB64);
    }
    p.data = forge.util.decode64(data);
    p.iv = forge.util.decode64(iv);
    p.macData = p.iv + p.data;
    if (p.macKey == null && key.macKeyB64 != null) {
      p.macKey = forge.util.decode64(key.macKeyB64);
    }
    if (mac != null) {
      p.mac = forge.util.decode64(mac);
    }

    // cache byte string keys for later
    if (key.meta == null) {
      key.meta = {};
    }
    if (key.meta.encKeyByteString == null) {
      key.meta.encKeyByteString = p.encKey;
    }
    if (p.macKey != null && key.meta.macKeyByteString == null) {
      key.meta.macKeyByteString = p.macKey;
    }

    return p;
  }

  aesDecryptFast(parameters: DecryptParameters<string>): Promise<string> {
    const dataBuffer = forge.util.createBuffer(parameters.data);
    const decipher = forge.cipher.createDecipher("AES-CBC", parameters.encKey);
    decipher.start({ iv: parameters.iv });
    decipher.update(dataBuffer);
    decipher.finish();
    const val = decipher.output.toString();
    return Promise.resolve(val);
  }

  async aesDecrypt(data: ArrayBuffer, iv: ArrayBuffer, key: ArrayBuffer): Promise<ArrayBuffer> {
    const impKey = await this.subtle.importKey("raw", key, { name: "AES-CBC" } as any, false, [
      "decrypt",
    ]);
    return await this.subtle.decrypt({ name: "AES-CBC", iv: iv }, impKey, data);
  }

  async rsaEncrypt(
    data: ArrayBuffer,
    publicKey: ArrayBuffer,
    algorithm: "sha1" | "sha256"
  ): Promise<ArrayBuffer> {
    // Note: Edge browser requires that we specify name and hash for both key import and decrypt.
    // We cannot use the proper types here.
    const rsaParams = {
      name: "RSA-OAEP",
      hash: { name: this.toWebCryptoAlgorithm(algorithm) },
    };
    const impKey = await this.subtle.importKey("spki", publicKey, rsaParams, false, ["encrypt"]);
    return await this.subtle.encrypt(rsaParams, impKey, data);
  }

  async rsaDecrypt(
    data: ArrayBuffer,
    privateKey: ArrayBuffer,
    algorithm: "sha1" | "sha256"
  ): Promise<ArrayBuffer> {
    // Note: Edge browser requires that we specify name and hash for both key import and decrypt.
    // We cannot use the proper types here.
    const rsaParams = {
      name: "RSA-OAEP",
      hash: { name: this.toWebCryptoAlgorithm(algorithm) },
    };
    const impKey = await this.subtle.importKey("pkcs8", privateKey, rsaParams, false, ["decrypt"]);
    return await this.subtle.decrypt(rsaParams, impKey, data);
  }

  async rsaExtractPublicKey(privateKey: ArrayBuffer): Promise<ArrayBuffer> {
    const rsaParams = {
      name: "RSA-OAEP",
      // Have to specify some algorithm
      hash: { name: this.toWebCryptoAlgorithm("sha1") },
    };
    const impPrivateKey = await this.subtle.importKey("pkcs8", privateKey, rsaParams, true, [
      "decrypt",
    ]);
    const jwkPrivateKey = await this.subtle.exportKey("jwk", impPrivateKey);
    const jwkPublicKeyParams = {
      kty: "RSA",
      e: jwkPrivateKey.e,
      n: jwkPrivateKey.n,
      alg: "RSA-OAEP",
      ext: true,
    };
    const impPublicKey = await this.subtle.importKey("jwk", jwkPublicKeyParams, rsaParams, true, [
      "encrypt",
    ]);
    return await this.subtle.exportKey("spki", impPublicKey);
  }

  async rsaGenerateKeyPair(length: 1024 | 2048 | 4096): Promise<[ArrayBuffer, ArrayBuffer]> {
    const rsaParams = {
      name: "RSA-OAEP",
      modulusLength: length,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      // Have to specify some algorithm
      hash: { name: this.toWebCryptoAlgorithm("sha1") },
    };
    const keyPair = (await this.subtle.generateKey(rsaParams, true, [
      "encrypt",
      "decrypt",
    ])) as CryptoKeyPair;
    const publicKey = await this.subtle.exportKey("spki", keyPair.publicKey);
    const privateKey = await this.subtle.exportKey("pkcs8", keyPair.privateKey);
    return [publicKey, privateKey];
  }

  randomBytes(length: number): Promise<ArrayBuffer> {
    const arr = new Uint8Array(length);
    this.crypto.getRandomValues(arr);
    return Promise.resolve(arr.buffer);
  }

  private toBuf(value: string | ArrayBuffer): ArrayBuffer {
    let buf: ArrayBuffer;
    if (typeof value === "string") {
      buf = Utils.fromUtf8ToArray(value).buffer;
    } else {
      buf = value;
    }
    return buf;
  }

  private toByteString(value: string | ArrayBuffer): string {
    let bytes: string;
    if (typeof value === "string") {
      bytes = forge.util.encodeUtf8(value);
    } else {
      bytes = Utils.fromBufferToByteString(value);
    }
    return bytes;
  }

  private toWebCryptoAlgorithm(algorithm: "sha1" | "sha256" | "sha512" | "md5"): string {
    if (algorithm === "md5") {
      throw new Error("MD5 is not supported in WebCrypto.");
    }
    return algorithm === "sha1" ? "SHA-1" : algorithm === "sha256" ? "SHA-256" : "SHA-512";
  }
}
