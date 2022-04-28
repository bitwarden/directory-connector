import * as bigInt from "big-integer";

import { CryptoService as CryptoServiceAbstraction } from "../abstractions/crypto.service";
import { CryptoFunctionService } from "../abstractions/cryptoFunction.service";
import { LogService } from "../abstractions/log.service";
import { PlatformUtilsService } from "../abstractions/platformUtils.service";
import { StateService } from "../abstractions/state.service";
import { EncryptionType } from "../enums/encryptionType";
import { HashPurpose } from "../enums/hashPurpose";
import { KdfType } from "../enums/kdfType";
import { KeySuffixOptions } from "../enums/keySuffixOptions";
import { sequentialize } from "../misc/sequentialize";
import { Utils } from "../misc/utils";
import { EEFLongWordList } from "../misc/wordlist";
import { EncArrayBuffer } from "../models/domain/encArrayBuffer";
import { EncString } from "../models/domain/encString";
import { EncryptedObject } from "../models/domain/encryptedObject";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";
import { ProfileOrganizationResponse } from "../models/response/profileOrganizationResponse";
import { ProfileProviderOrganizationResponse } from "../models/response/profileProviderOrganizationResponse";
import { ProfileProviderResponse } from "../models/response/profileProviderResponse";

export class CryptoService implements CryptoServiceAbstraction {
  constructor(
    private cryptoFunctionService: CryptoFunctionService,
    protected platformUtilService: PlatformUtilsService,
    protected logService: LogService,
    protected stateService: StateService
  ) {}

  async setKey(key: SymmetricCryptoKey, userId?: string): Promise<any> {
    await this.stateService.setCryptoMasterKey(key, { userId: userId });
    await this.storeKey(key, userId);
  }

  async setKeyHash(keyHash: string): Promise<void> {
    await this.stateService.setKeyHash(keyHash);
  }

  async setEncKey(encKey: string): Promise<void> {
    if (encKey == null) {
      return;
    }

    await this.stateService.setDecryptedCryptoSymmetricKey(null);
    await this.stateService.setEncryptedCryptoSymmetricKey(encKey);
  }

  async setEncPrivateKey(encPrivateKey: string): Promise<void> {
    if (encPrivateKey == null) {
      return;
    }

    await this.stateService.setDecryptedPrivateKey(null);
    await this.stateService.setEncryptedPrivateKey(encPrivateKey);
  }

  async setOrgKeys(
    orgs: ProfileOrganizationResponse[],
    providerOrgs: ProfileProviderOrganizationResponse[]
  ): Promise<void> {
    const orgKeys: any = {};
    orgs.forEach((org) => {
      orgKeys[org.id] = org.key;
    });

    for (const providerOrg of providerOrgs) {
      // Convert provider encrypted keys to user encrypted.
      const providerKey = await this.getProviderKey(providerOrg.providerId);
      const decValue = await this.decryptToBytes(new EncString(providerOrg.key), providerKey);
      orgKeys[providerOrg.id] = (await this.rsaEncrypt(decValue)).encryptedString;
    }

    await this.stateService.setDecryptedOrganizationKeys(null);
    return await this.stateService.setEncryptedOrganizationKeys(orgKeys);
  }

  async setProviderKeys(providers: ProfileProviderResponse[]): Promise<void> {
    const providerKeys: any = {};
    providers.forEach((provider) => {
      providerKeys[provider.id] = provider.key;
    });

    await this.stateService.setDecryptedProviderKeys(null);
    return await this.stateService.setEncryptedProviderKeys(providerKeys);
  }

  async getKey(keySuffix?: KeySuffixOptions, userId?: string): Promise<SymmetricCryptoKey> {
    const inMemoryKey = await this.stateService.getCryptoMasterKey({ userId: userId });

    if (inMemoryKey != null) {
      return inMemoryKey;
    }

    keySuffix ||= KeySuffixOptions.Auto;
    const symmetricKey = await this.getKeyFromStorage(keySuffix, userId);

    if (symmetricKey != null) {
      // TODO: Refactor here so get key doesn't also set key
      this.setKey(symmetricKey, userId);
    }

    return symmetricKey;
  }

  async getKeyFromStorage(
    keySuffix: KeySuffixOptions,
    userId?: string
  ): Promise<SymmetricCryptoKey> {
    const key = await this.retrieveKeyFromStorage(keySuffix, userId);
    if (key != null) {
      const symmetricKey = new SymmetricCryptoKey(Utils.fromB64ToArray(key).buffer);

      if (!(await this.validateKey(symmetricKey))) {
        this.logService.warning("Wrong key, throwing away stored key");
        await this.clearSecretKeyStore(userId);
        return null;
      }

      return symmetricKey;
    }
    return null;
  }

  async getKeyHash(): Promise<string> {
    return await this.stateService.getKeyHash();
  }

  async compareAndUpdateKeyHash(masterPassword: string, key: SymmetricCryptoKey): Promise<boolean> {
    const storedKeyHash = await this.getKeyHash();
    if (masterPassword != null && storedKeyHash != null) {
      const localKeyHash = await this.hashPassword(
        masterPassword,
        key,
        HashPurpose.LocalAuthorization
      );
      if (localKeyHash != null && storedKeyHash === localKeyHash) {
        return true;
      }

      // TODO: remove serverKeyHash check in 1-2 releases after everyone's keyHash has been updated
      const serverKeyHash = await this.hashPassword(
        masterPassword,
        key,
        HashPurpose.ServerAuthorization
      );
      if (serverKeyHash != null && storedKeyHash === serverKeyHash) {
        await this.setKeyHash(localKeyHash);
        return true;
      }
    }

    return false;
  }

  @sequentialize(() => "getEncKey")
  getEncKey(key: SymmetricCryptoKey = null): Promise<SymmetricCryptoKey> {
    return this.getEncKeyHelper(key);
  }

  async getPublicKey(): Promise<ArrayBuffer> {
    const inMemoryPublicKey = await this.stateService.getPublicKey();
    if (inMemoryPublicKey != null) {
      return inMemoryPublicKey;
    }

    const privateKey = await this.getPrivateKey();
    if (privateKey == null) {
      return null;
    }

    const publicKey = await this.cryptoFunctionService.rsaExtractPublicKey(privateKey);
    await this.stateService.setPublicKey(publicKey);
    return publicKey;
  }

  async getPrivateKey(): Promise<ArrayBuffer> {
    const decryptedPrivateKey = await this.stateService.getDecryptedPrivateKey();
    if (decryptedPrivateKey != null) {
      return decryptedPrivateKey;
    }

    const encPrivateKey = await this.stateService.getEncryptedPrivateKey();
    if (encPrivateKey == null) {
      return null;
    }

    const privateKey = await this.decryptToBytes(new EncString(encPrivateKey), null);
    await this.stateService.setDecryptedPrivateKey(privateKey);
    return privateKey;
  }

  async getFingerprint(userId: string, publicKey?: ArrayBuffer): Promise<string[]> {
    if (publicKey == null) {
      publicKey = await this.getPublicKey();
    }
    if (publicKey === null) {
      throw new Error("No public key available.");
    }
    const keyFingerprint = await this.cryptoFunctionService.hash(publicKey, "sha256");
    const userFingerprint = await this.cryptoFunctionService.hkdfExpand(
      keyFingerprint,
      userId,
      32,
      "sha256"
    );
    return this.hashPhrase(userFingerprint);
  }

  @sequentialize(() => "getOrgKeys")
  async getOrgKeys(): Promise<Map<string, SymmetricCryptoKey>> {
    const orgKeys: Map<string, SymmetricCryptoKey> = new Map<string, SymmetricCryptoKey>();
    const decryptedOrganizationKeys = await this.stateService.getDecryptedOrganizationKeys();
    if (decryptedOrganizationKeys != null && decryptedOrganizationKeys.size > 0) {
      return decryptedOrganizationKeys;
    }

    const encOrgKeys = await this.stateService.getEncryptedOrganizationKeys();
    if (encOrgKeys == null) {
      return null;
    }

    let setKey = false;

    for (const orgId in encOrgKeys) {
      // eslint-disable-next-line
      if (!encOrgKeys.hasOwnProperty(orgId)) {
        continue;
      }

      const decValue = await this.rsaDecrypt(encOrgKeys[orgId]);
      orgKeys.set(orgId, new SymmetricCryptoKey(decValue));
      setKey = true;
    }

    if (setKey) {
      await this.stateService.setDecryptedOrganizationKeys(orgKeys);
    }

    return orgKeys;
  }

  async getOrgKey(orgId: string): Promise<SymmetricCryptoKey> {
    if (orgId == null) {
      return null;
    }

    const orgKeys = await this.getOrgKeys();
    if (orgKeys == null || !orgKeys.has(orgId)) {
      return null;
    }

    return orgKeys.get(orgId);
  }

  @sequentialize(() => "getProviderKeys")
  async getProviderKeys(): Promise<Map<string, SymmetricCryptoKey>> {
    const providerKeys: Map<string, SymmetricCryptoKey> = new Map<string, SymmetricCryptoKey>();
    const decryptedProviderKeys = await this.stateService.getDecryptedProviderKeys();
    if (decryptedProviderKeys != null && decryptedProviderKeys.size > 0) {
      return decryptedProviderKeys;
    }

    const encProviderKeys = await this.stateService.getEncryptedProviderKeys();
    if (encProviderKeys == null) {
      return null;
    }

    let setKey = false;

    for (const orgId in encProviderKeys) {
      // eslint-disable-next-line
      if (!encProviderKeys.hasOwnProperty(orgId)) {
        continue;
      }

      const decValue = await this.rsaDecrypt(encProviderKeys[orgId]);
      providerKeys.set(orgId, new SymmetricCryptoKey(decValue));
      setKey = true;
    }

    if (setKey) {
      await this.stateService.setDecryptedProviderKeys(providerKeys);
    }

    return providerKeys;
  }

  async getProviderKey(providerId: string): Promise<SymmetricCryptoKey> {
    if (providerId == null) {
      return null;
    }

    const providerKeys = await this.getProviderKeys();
    if (providerKeys == null || !providerKeys.has(providerId)) {
      return null;
    }

    return providerKeys.get(providerId);
  }

  async hasKey(): Promise<boolean> {
    return (
      (await this.hasKeyInMemory()) ||
      (await this.hasKeyStored(KeySuffixOptions.Auto)) ||
      (await this.hasKeyStored(KeySuffixOptions.Biometric))
    );
  }

  async hasKeyInMemory(userId?: string): Promise<boolean> {
    return (await this.stateService.getCryptoMasterKey({ userId: userId })) != null;
  }

  async hasKeyStored(keySuffix: KeySuffixOptions, userId?: string): Promise<boolean> {
    switch (keySuffix) {
      case KeySuffixOptions.Auto:
        return (await this.stateService.getCryptoMasterKeyAuto({ userId: userId })) != null;
      case KeySuffixOptions.Biometric:
        return (await this.stateService.hasCryptoMasterKeyBiometric({ userId: userId })) === true;
      default:
        return false;
    }
  }

  async hasEncKey(): Promise<boolean> {
    return (await this.stateService.getEncryptedCryptoSymmetricKey()) != null;
  }

  async clearKey(clearSecretStorage = true, userId?: string): Promise<any> {
    await this.stateService.setCryptoMasterKey(null, { userId: userId });
    await this.stateService.setLegacyEtmKey(null, { userId: userId });
    if (clearSecretStorage) {
      await this.clearSecretKeyStore(userId);
    }
  }

  async clearStoredKey(keySuffix: KeySuffixOptions) {
    keySuffix === KeySuffixOptions.Auto
      ? await this.stateService.setCryptoMasterKeyAuto(null)
      : await this.stateService.setCryptoMasterKeyBiometric(null);
  }

  async clearKeyHash(userId?: string): Promise<any> {
    return await this.stateService.setKeyHash(null, { userId: userId });
  }

  async clearEncKey(memoryOnly?: boolean, userId?: string): Promise<void> {
    await this.stateService.setDecryptedCryptoSymmetricKey(null, { userId: userId });
    if (!memoryOnly) {
      await this.stateService.setEncryptedCryptoSymmetricKey(null, { userId: userId });
    }
  }

  async clearKeyPair(memoryOnly?: boolean, userId?: string): Promise<any> {
    const keysToClear: Promise<void>[] = [
      this.stateService.setDecryptedPrivateKey(null, { userId: userId }),
      this.stateService.setPublicKey(null, { userId: userId }),
    ];
    if (!memoryOnly) {
      keysToClear.push(this.stateService.setEncryptedPrivateKey(null, { userId: userId }));
    }
    return Promise.all(keysToClear);
  }

  async clearOrgKeys(memoryOnly?: boolean, userId?: string): Promise<void> {
    await this.stateService.setDecryptedOrganizationKeys(null, { userId: userId });
    if (!memoryOnly) {
      await this.stateService.setEncryptedOrganizationKeys(null, { userId: userId });
    }
  }

  async clearProviderKeys(memoryOnly?: boolean, userId?: string): Promise<void> {
    await this.stateService.setDecryptedProviderKeys(null, { userId: userId });
    if (!memoryOnly) {
      await this.stateService.setEncryptedProviderKeys(null, { userId: userId });
    }
  }

  async clearPinProtectedKey(userId?: string): Promise<any> {
    return await this.stateService.setEncryptedPinProtected(null, { userId: userId });
  }

  async clearKeys(userId?: string): Promise<any> {
    await this.clearKey(true, userId);
    await this.clearKeyHash(userId);
    await this.clearOrgKeys(false, userId);
    await this.clearProviderKeys(false, userId);
    await this.clearEncKey(false, userId);
    await this.clearKeyPair(false, userId);
    await this.clearPinProtectedKey(userId);
  }

  async toggleKey(): Promise<any> {
    const key = await this.getKey();

    await this.setKey(key);
  }

  async makeKey(
    password: string,
    salt: string,
    kdf: KdfType,
    kdfIterations: number
  ): Promise<SymmetricCryptoKey> {
    let key: ArrayBuffer = null;
    if (kdf == null || kdf === KdfType.PBKDF2_SHA256) {
      if (kdfIterations == null) {
        kdfIterations = 5000;
      } else if (kdfIterations < 5000) {
        throw new Error("PBKDF2 iteration minimum is 5000.");
      }
      key = await this.cryptoFunctionService.pbkdf2(password, salt, "sha256", kdfIterations);
    } else {
      throw new Error("Unknown Kdf.");
    }
    return new SymmetricCryptoKey(key);
  }

  async makeKeyFromPin(
    pin: string,
    salt: string,
    kdf: KdfType,
    kdfIterations: number,
    protectedKeyCs: EncString = null
  ): Promise<SymmetricCryptoKey> {
    if (protectedKeyCs == null) {
      const pinProtectedKey = await this.stateService.getEncryptedPinProtected();
      if (pinProtectedKey == null) {
        throw new Error("No PIN protected key found.");
      }
      protectedKeyCs = new EncString(pinProtectedKey);
    }
    const pinKey = await this.makePinKey(pin, salt, kdf, kdfIterations);
    const decKey = await this.decryptToBytes(protectedKeyCs, pinKey);
    return new SymmetricCryptoKey(decKey);
  }

  async makeShareKey(): Promise<[EncString, SymmetricCryptoKey]> {
    const shareKey = await this.cryptoFunctionService.randomBytes(64);
    const publicKey = await this.getPublicKey();
    const encShareKey = await this.rsaEncrypt(shareKey, publicKey);
    return [encShareKey, new SymmetricCryptoKey(shareKey)];
  }

  async makeKeyPair(key?: SymmetricCryptoKey): Promise<[string, EncString]> {
    const keyPair = await this.cryptoFunctionService.rsaGenerateKeyPair(2048);
    const publicB64 = Utils.fromBufferToB64(keyPair[0]);
    const privateEnc = await this.encrypt(keyPair[1], key);
    return [publicB64, privateEnc];
  }

  async makePinKey(
    pin: string,
    salt: string,
    kdf: KdfType,
    kdfIterations: number
  ): Promise<SymmetricCryptoKey> {
    const pinKey = await this.makeKey(pin, salt, kdf, kdfIterations);
    return await this.stretchKey(pinKey);
  }

  async makeSendKey(keyMaterial: ArrayBuffer): Promise<SymmetricCryptoKey> {
    const sendKey = await this.cryptoFunctionService.hkdf(
      keyMaterial,
      "bitwarden-send",
      "send",
      64,
      "sha256"
    );
    return new SymmetricCryptoKey(sendKey);
  }

  async hashPassword(
    password: string,
    key: SymmetricCryptoKey,
    hashPurpose?: HashPurpose
  ): Promise<string> {
    if (key == null) {
      key = await this.getKey();
    }
    if (password == null || key == null) {
      throw new Error("Invalid parameters.");
    }

    const iterations = hashPurpose === HashPurpose.LocalAuthorization ? 2 : 1;
    const hash = await this.cryptoFunctionService.pbkdf2(key.key, password, "sha256", iterations);
    return Utils.fromBufferToB64(hash);
  }

  async makeEncKey(key: SymmetricCryptoKey): Promise<[SymmetricCryptoKey, EncString]> {
    const theKey = await this.getKeyForEncryption(key);
    const encKey = await this.cryptoFunctionService.randomBytes(64);
    return this.buildEncKey(theKey, encKey);
  }

  async remakeEncKey(
    key: SymmetricCryptoKey,
    encKey?: SymmetricCryptoKey
  ): Promise<[SymmetricCryptoKey, EncString]> {
    if (encKey == null) {
      encKey = await this.getEncKey();
    }
    return this.buildEncKey(key, encKey.key);
  }

  async encrypt(plainValue: string | ArrayBuffer, key?: SymmetricCryptoKey): Promise<EncString> {
    if (plainValue == null) {
      return Promise.resolve(null);
    }

    let plainBuf: ArrayBuffer;
    if (typeof plainValue === "string") {
      plainBuf = Utils.fromUtf8ToArray(plainValue).buffer;
    } else {
      plainBuf = plainValue;
    }

    const encObj = await this.aesEncrypt(plainBuf, key);
    const iv = Utils.fromBufferToB64(encObj.iv);
    const data = Utils.fromBufferToB64(encObj.data);
    const mac = encObj.mac != null ? Utils.fromBufferToB64(encObj.mac) : null;
    return new EncString(encObj.key.encType, data, iv, mac);
  }

  async encryptToBytes(plainValue: ArrayBuffer, key?: SymmetricCryptoKey): Promise<EncArrayBuffer> {
    const encValue = await this.aesEncrypt(plainValue, key);
    let macLen = 0;
    if (encValue.mac != null) {
      macLen = encValue.mac.byteLength;
    }

    const encBytes = new Uint8Array(1 + encValue.iv.byteLength + macLen + encValue.data.byteLength);
    encBytes.set([encValue.key.encType]);
    encBytes.set(new Uint8Array(encValue.iv), 1);
    if (encValue.mac != null) {
      encBytes.set(new Uint8Array(encValue.mac), 1 + encValue.iv.byteLength);
    }

    encBytes.set(new Uint8Array(encValue.data), 1 + encValue.iv.byteLength + macLen);
    return new EncArrayBuffer(encBytes.buffer);
  }

  async rsaEncrypt(data: ArrayBuffer, publicKey?: ArrayBuffer): Promise<EncString> {
    if (publicKey == null) {
      publicKey = await this.getPublicKey();
    }
    if (publicKey == null) {
      throw new Error("Public key unavailable.");
    }

    const encBytes = await this.cryptoFunctionService.rsaEncrypt(data, publicKey, "sha1");
    return new EncString(EncryptionType.Rsa2048_OaepSha1_B64, Utils.fromBufferToB64(encBytes));
  }

  async rsaDecrypt(encValue: string, privateKeyValue?: ArrayBuffer): Promise<ArrayBuffer> {
    const headerPieces = encValue.split(".");
    let encType: EncryptionType = null;
    let encPieces: string[];

    if (headerPieces.length === 1) {
      encType = EncryptionType.Rsa2048_OaepSha256_B64;
      encPieces = [headerPieces[0]];
    } else if (headerPieces.length === 2) {
      try {
        encType = parseInt(headerPieces[0], null);
        encPieces = headerPieces[1].split("|");
      } catch (e) {
        this.logService.error(e);
      }
    }

    switch (encType) {
      case EncryptionType.Rsa2048_OaepSha256_B64:
      case EncryptionType.Rsa2048_OaepSha1_B64:
      case EncryptionType.Rsa2048_OaepSha256_HmacSha256_B64: // HmacSha256 types are deprecated
      case EncryptionType.Rsa2048_OaepSha1_HmacSha256_B64:
        break;
      default:
        throw new Error("encType unavailable.");
    }

    if (encPieces == null || encPieces.length <= 0) {
      throw new Error("encPieces unavailable.");
    }

    const data = Utils.fromB64ToArray(encPieces[0]).buffer;
    const privateKey = privateKeyValue ?? (await this.getPrivateKey());
    if (privateKey == null) {
      throw new Error("No private key.");
    }

    let alg: "sha1" | "sha256" = "sha1";
    switch (encType) {
      case EncryptionType.Rsa2048_OaepSha256_B64:
      case EncryptionType.Rsa2048_OaepSha256_HmacSha256_B64:
        alg = "sha256";
        break;
      case EncryptionType.Rsa2048_OaepSha1_B64:
      case EncryptionType.Rsa2048_OaepSha1_HmacSha256_B64:
        break;
      default:
        throw new Error("encType unavailable.");
    }

    return this.cryptoFunctionService.rsaDecrypt(data, privateKey, alg);
  }

  async decryptToBytes(encString: EncString, key?: SymmetricCryptoKey): Promise<ArrayBuffer> {
    const iv = Utils.fromB64ToArray(encString.iv).buffer;
    const data = Utils.fromB64ToArray(encString.data).buffer;
    const mac = encString.mac ? Utils.fromB64ToArray(encString.mac).buffer : null;
    const decipher = await this.aesDecryptToBytes(encString.encryptionType, data, iv, mac, key);
    if (decipher == null) {
      return null;
    }

    return decipher;
  }

  async decryptToUtf8(encString: EncString, key?: SymmetricCryptoKey): Promise<string> {
    return await this.aesDecryptToUtf8(
      encString.encryptionType,
      encString.data,
      encString.iv,
      encString.mac,
      key
    );
  }

  async decryptFromBytes(encBuf: ArrayBuffer, key: SymmetricCryptoKey): Promise<ArrayBuffer> {
    if (encBuf == null) {
      throw new Error("no encBuf.");
    }

    const encBytes = new Uint8Array(encBuf);
    const encType = encBytes[0];
    let ctBytes: Uint8Array = null;
    let ivBytes: Uint8Array = null;
    let macBytes: Uint8Array = null;

    switch (encType) {
      case EncryptionType.AesCbc128_HmacSha256_B64:
      case EncryptionType.AesCbc256_HmacSha256_B64:
        if (encBytes.length <= 49) {
          // 1 + 16 + 32 + ctLength
          return null;
        }

        ivBytes = encBytes.slice(1, 17);
        macBytes = encBytes.slice(17, 49);
        ctBytes = encBytes.slice(49);
        break;
      case EncryptionType.AesCbc256_B64:
        if (encBytes.length <= 17) {
          // 1 + 16 + ctLength
          return null;
        }

        ivBytes = encBytes.slice(1, 17);
        ctBytes = encBytes.slice(17);
        break;
      default:
        return null;
    }

    return await this.aesDecryptToBytes(
      encType,
      ctBytes.buffer,
      ivBytes.buffer,
      macBytes != null ? macBytes.buffer : null,
      key
    );
  }

  // EFForg/OpenWireless
  // ref https://github.com/EFForg/OpenWireless/blob/master/app/js/diceware.js
  async randomNumber(min: number, max: number): Promise<number> {
    let rval = 0;
    const range = max - min + 1;
    const bitsNeeded = Math.ceil(Math.log2(range));
    if (bitsNeeded > 53) {
      throw new Error("We cannot generate numbers larger than 53 bits.");
    }

    const bytesNeeded = Math.ceil(bitsNeeded / 8);
    const mask = Math.pow(2, bitsNeeded) - 1;
    // 7776 -> (2^13 = 8192) -1 == 8191 or 0x00001111 11111111

    // Fill a byte array with N random numbers
    const byteArray = new Uint8Array(await this.cryptoFunctionService.randomBytes(bytesNeeded));

    let p = (bytesNeeded - 1) * 8;
    for (let i = 0; i < bytesNeeded; i++) {
      rval += byteArray[i] * Math.pow(2, p);
      p -= 8;
    }

    // Use & to apply the mask and reduce the number of recursive lookups
    rval = rval & mask;

    if (rval >= range) {
      // Integer out of acceptable range
      return this.randomNumber(min, max);
    }

    // Return an integer that falls within the range
    return min + rval;
  }

  async validateKey(key: SymmetricCryptoKey) {
    try {
      const encPrivateKey = await this.stateService.getEncryptedPrivateKey();
      const encKey = await this.getEncKeyHelper(key);
      if (encPrivateKey == null || encKey == null) {
        return false;
      }

      const privateKey = await this.decryptToBytes(new EncString(encPrivateKey), encKey);
      await this.cryptoFunctionService.rsaExtractPublicKey(privateKey);
    } catch (e) {
      return false;
    }

    return true;
  }

  // Helpers
  protected async storeKey(key: SymmetricCryptoKey, userId?: string) {
    if (await this.shouldStoreKey(KeySuffixOptions.Auto, userId)) {
      await this.stateService.setCryptoMasterKeyAuto(key.keyB64, { userId: userId });
    } else if (await this.shouldStoreKey(KeySuffixOptions.Biometric, userId)) {
      await this.stateService.setCryptoMasterKeyBiometric(key.keyB64, { userId: userId });
    } else {
      await this.stateService.setCryptoMasterKeyAuto(null, { userId: userId });
      await this.stateService.setCryptoMasterKeyBiometric(null, { userId: userId });
    }
  }

  protected async shouldStoreKey(keySuffix: KeySuffixOptions, userId?: string) {
    let shouldStoreKey = false;
    if (keySuffix === KeySuffixOptions.Auto) {
      const vaultTimeout = await this.stateService.getVaultTimeout({ userId: userId });
      shouldStoreKey = vaultTimeout == null;
    } else if (keySuffix === KeySuffixOptions.Biometric) {
      const biometricUnlock = await this.stateService.getBiometricUnlock({ userId: userId });
      shouldStoreKey = biometricUnlock && this.platformUtilService.supportsSecureStorage();
    }
    return shouldStoreKey;
  }

  protected async retrieveKeyFromStorage(keySuffix: KeySuffixOptions, userId?: string) {
    return keySuffix === KeySuffixOptions.Auto
      ? await this.stateService.getCryptoMasterKeyAuto({ userId: userId })
      : await this.stateService.getCryptoMasterKeyBiometric({ userId: userId });
  }

  private async aesEncrypt(data: ArrayBuffer, key: SymmetricCryptoKey): Promise<EncryptedObject> {
    const obj = new EncryptedObject();
    obj.key = await this.getKeyForEncryption(key);
    obj.iv = await this.cryptoFunctionService.randomBytes(16);
    obj.data = await this.cryptoFunctionService.aesEncrypt(data, obj.iv, obj.key.encKey);

    if (obj.key.macKey != null) {
      const macData = new Uint8Array(obj.iv.byteLength + obj.data.byteLength);
      macData.set(new Uint8Array(obj.iv), 0);
      macData.set(new Uint8Array(obj.data), obj.iv.byteLength);
      obj.mac = await this.cryptoFunctionService.hmac(macData.buffer, obj.key.macKey, "sha256");
    }

    return obj;
  }

  private async aesDecryptToUtf8(
    encType: EncryptionType,
    data: string,
    iv: string,
    mac: string,
    key: SymmetricCryptoKey
  ): Promise<string> {
    const keyForEnc = await this.getKeyForEncryption(key);
    const theKey = await this.resolveLegacyKey(encType, keyForEnc);

    if (theKey.macKey != null && mac == null) {
      this.logService.error("mac required.");
      return null;
    }

    if (theKey.encType !== encType) {
      this.logService.error("encType unavailable.");
      return null;
    }

    const fastParams = this.cryptoFunctionService.aesDecryptFastParameters(data, iv, mac, theKey);
    if (fastParams.macKey != null && fastParams.mac != null) {
      const computedMac = await this.cryptoFunctionService.hmacFast(
        fastParams.macData,
        fastParams.macKey,
        "sha256"
      );
      const macsEqual = await this.cryptoFunctionService.compareFast(fastParams.mac, computedMac);
      if (!macsEqual) {
        this.logService.error("mac failed.");
        return null;
      }
    }

    return this.cryptoFunctionService.aesDecryptFast(fastParams);
  }

  private async aesDecryptToBytes(
    encType: EncryptionType,
    data: ArrayBuffer,
    iv: ArrayBuffer,
    mac: ArrayBuffer,
    key: SymmetricCryptoKey
  ): Promise<ArrayBuffer> {
    const keyForEnc = await this.getKeyForEncryption(key);
    const theKey = await this.resolveLegacyKey(encType, keyForEnc);

    if (theKey.macKey != null && mac == null) {
      return null;
    }

    if (theKey.encType !== encType) {
      return null;
    }

    if (theKey.macKey != null && mac != null) {
      const macData = new Uint8Array(iv.byteLength + data.byteLength);
      macData.set(new Uint8Array(iv), 0);
      macData.set(new Uint8Array(data), iv.byteLength);
      const computedMac = await this.cryptoFunctionService.hmac(
        macData.buffer,
        theKey.macKey,
        "sha256"
      );
      if (computedMac === null) {
        return null;
      }

      const macsMatch = await this.cryptoFunctionService.compare(mac, computedMac);
      if (!macsMatch) {
        this.logService.error("mac failed.");
        return null;
      }
    }

    return await this.cryptoFunctionService.aesDecrypt(data, iv, theKey.encKey);
  }

  private async getKeyForEncryption(key?: SymmetricCryptoKey): Promise<SymmetricCryptoKey> {
    if (key != null) {
      return key;
    }

    const encKey = await this.getEncKey();
    if (encKey != null) {
      return encKey;
    }

    return await this.getKey();
  }

  private async resolveLegacyKey(
    encType: EncryptionType,
    key: SymmetricCryptoKey
  ): Promise<SymmetricCryptoKey> {
    if (
      encType === EncryptionType.AesCbc128_HmacSha256_B64 &&
      key.encType === EncryptionType.AesCbc256_B64
    ) {
      // Old encrypt-then-mac scheme, make a new key
      let legacyKey = await this.stateService.getLegacyEtmKey();
      if (legacyKey == null) {
        legacyKey = new SymmetricCryptoKey(key.key, EncryptionType.AesCbc128_HmacSha256_B64);
        await this.stateService.setLegacyEtmKey(legacyKey);
      }
      return legacyKey;
    }

    return key;
  }

  private async stretchKey(key: SymmetricCryptoKey): Promise<SymmetricCryptoKey> {
    const newKey = new Uint8Array(64);
    const encKey = await this.cryptoFunctionService.hkdfExpand(key.key, "enc", 32, "sha256");
    const macKey = await this.cryptoFunctionService.hkdfExpand(key.key, "mac", 32, "sha256");
    newKey.set(new Uint8Array(encKey));
    newKey.set(new Uint8Array(macKey), 32);
    return new SymmetricCryptoKey(newKey.buffer);
  }

  private async hashPhrase(hash: ArrayBuffer, minimumEntropy = 64) {
    const entropyPerWord = Math.log(EEFLongWordList.length) / Math.log(2);
    let numWords = Math.ceil(minimumEntropy / entropyPerWord);

    const hashArr = Array.from(new Uint8Array(hash));
    const entropyAvailable = hashArr.length * 4;
    if (numWords * entropyPerWord > entropyAvailable) {
      throw new Error("Output entropy of hash function is too small");
    }

    const phrase: string[] = [];
    let hashNumber = bigInt.fromArray(hashArr, 256);
    while (numWords--) {
      const remainder = hashNumber.mod(EEFLongWordList.length);
      hashNumber = hashNumber.divide(EEFLongWordList.length);
      phrase.push(EEFLongWordList[remainder as any]);
    }
    return phrase;
  }

  private async buildEncKey(
    key: SymmetricCryptoKey,
    encKey: ArrayBuffer
  ): Promise<[SymmetricCryptoKey, EncString]> {
    let encKeyEnc: EncString = null;
    if (key.key.byteLength === 32) {
      const newKey = await this.stretchKey(key);
      encKeyEnc = await this.encrypt(encKey, newKey);
    } else if (key.key.byteLength === 64) {
      encKeyEnc = await this.encrypt(encKey, key);
    } else {
      throw new Error("Invalid key size.");
    }
    return [new SymmetricCryptoKey(encKey), encKeyEnc];
  }

  private async clearSecretKeyStore(userId?: string): Promise<void> {
    await this.stateService.setCryptoMasterKeyAuto(null, { userId: userId });
    await this.stateService.setCryptoMasterKeyBiometric(null, { userId: userId });
  }

  private async getEncKeyHelper(key: SymmetricCryptoKey = null): Promise<SymmetricCryptoKey> {
    const inMemoryKey = await this.stateService.getDecryptedCryptoSymmetricKey();
    if (inMemoryKey != null) {
      return inMemoryKey;
    }

    const encKey = await this.stateService.getEncryptedCryptoSymmetricKey();
    if (encKey == null) {
      return null;
    }

    if (key == null) {
      key = await this.getKey();
    }
    if (key == null) {
      return null;
    }

    let decEncKey: ArrayBuffer;
    const encKeyCipher = new EncString(encKey);
    if (encKeyCipher.encryptionType === EncryptionType.AesCbc256_B64) {
      decEncKey = await this.decryptToBytes(encKeyCipher, key);
    } else if (encKeyCipher.encryptionType === EncryptionType.AesCbc256_HmacSha256_B64) {
      const newKey = await this.stretchKey(key);
      decEncKey = await this.decryptToBytes(encKeyCipher, newKey);
    } else {
      throw new Error("Unsupported encKey type.");
    }
    if (decEncKey == null) {
      return null;
    }
    const symmetricCryptoKey = new SymmetricCryptoKey(decEncKey);
    await this.stateService.setDecryptedCryptoSymmetricKey(symmetricCryptoKey);
    return symmetricCryptoKey;
  }
}
