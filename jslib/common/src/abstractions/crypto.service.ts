import { HashPurpose } from "../enums/hashPurpose";
import { KdfType } from "../enums/kdfType";
import { KeySuffixOptions } from "../enums/keySuffixOptions";
import { EncArrayBuffer } from "../models/domain/encArrayBuffer";
import { EncString } from "../models/domain/encString";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";
import { ProfileOrganizationResponse } from "../models/response/profileOrganizationResponse";
import { ProfileProviderOrganizationResponse } from "../models/response/profileProviderOrganizationResponse";
import { ProfileProviderResponse } from "../models/response/profileProviderResponse";

export abstract class CryptoService {
  setKey: (key: SymmetricCryptoKey) => Promise<any>;
  setKeyHash: (keyHash: string) => Promise<void>;
  setEncKey: (encKey: string) => Promise<void>;
  setEncPrivateKey: (encPrivateKey: string) => Promise<void>;
  setOrgKeys: (
    orgs: ProfileOrganizationResponse[],
    providerOrgs: ProfileProviderOrganizationResponse[]
  ) => Promise<void>;
  setProviderKeys: (orgs: ProfileProviderResponse[]) => Promise<void>;
  getKey: (keySuffix?: KeySuffixOptions, userId?: string) => Promise<SymmetricCryptoKey>;
  getKeyFromStorage: (keySuffix: KeySuffixOptions, userId?: string) => Promise<SymmetricCryptoKey>;
  getKeyHash: () => Promise<string>;
  compareAndUpdateKeyHash: (masterPassword: string, key: SymmetricCryptoKey) => Promise<boolean>;
  getEncKey: (key?: SymmetricCryptoKey) => Promise<SymmetricCryptoKey>;
  getPublicKey: () => Promise<ArrayBuffer>;
  getPrivateKey: () => Promise<ArrayBuffer>;
  getFingerprint: (userId: string, publicKey?: ArrayBuffer) => Promise<string[]>;
  getOrgKeys: () => Promise<Map<string, SymmetricCryptoKey>>;
  getOrgKey: (orgId: string) => Promise<SymmetricCryptoKey>;
  getProviderKey: (providerId: string) => Promise<SymmetricCryptoKey>;
  hasKey: () => Promise<boolean>;
  hasKeyInMemory: (userId?: string) => Promise<boolean>;
  hasKeyStored: (keySuffix?: KeySuffixOptions, userId?: string) => Promise<boolean>;
  hasEncKey: () => Promise<boolean>;
  clearKey: (clearSecretStorage?: boolean, userId?: string) => Promise<any>;
  clearKeyHash: () => Promise<any>;
  clearEncKey: (memoryOnly?: boolean, userId?: string) => Promise<any>;
  clearKeyPair: (memoryOnly?: boolean, userId?: string) => Promise<any>;
  clearOrgKeys: (memoryOnly?: boolean, userId?: string) => Promise<any>;
  clearProviderKeys: (memoryOnly?: boolean) => Promise<any>;
  clearPinProtectedKey: () => Promise<any>;
  clearKeys: (userId?: string) => Promise<any>;
  toggleKey: () => Promise<any>;
  makeKey: (
    password: string,
    salt: string,
    kdf: KdfType,
    kdfIterations: number
  ) => Promise<SymmetricCryptoKey>;
  makeKeyFromPin: (
    pin: string,
    salt: string,
    kdf: KdfType,
    kdfIterations: number,
    protectedKeyCs?: EncString
  ) => Promise<SymmetricCryptoKey>;
  makeShareKey: () => Promise<[EncString, SymmetricCryptoKey]>;
  makeKeyPair: (key?: SymmetricCryptoKey) => Promise<[string, EncString]>;
  makePinKey: (
    pin: string,
    salt: string,
    kdf: KdfType,
    kdfIterations: number
  ) => Promise<SymmetricCryptoKey>;
  makeSendKey: (keyMaterial: ArrayBuffer) => Promise<SymmetricCryptoKey>;
  hashPassword: (
    password: string,
    key: SymmetricCryptoKey,
    hashPurpose?: HashPurpose
  ) => Promise<string>;
  makeEncKey: (key: SymmetricCryptoKey) => Promise<[SymmetricCryptoKey, EncString]>;
  remakeEncKey: (
    key: SymmetricCryptoKey,
    encKey?: SymmetricCryptoKey
  ) => Promise<[SymmetricCryptoKey, EncString]>;
  encrypt: (plainValue: string | ArrayBuffer, key?: SymmetricCryptoKey) => Promise<EncString>;
  encryptToBytes: (plainValue: ArrayBuffer, key?: SymmetricCryptoKey) => Promise<EncArrayBuffer>;
  rsaEncrypt: (data: ArrayBuffer, publicKey?: ArrayBuffer) => Promise<EncString>;
  rsaDecrypt: (encValue: string, privateKeyValue?: ArrayBuffer) => Promise<ArrayBuffer>;
  decryptToBytes: (encString: EncString, key?: SymmetricCryptoKey) => Promise<ArrayBuffer>;
  decryptToUtf8: (encString: EncString, key?: SymmetricCryptoKey) => Promise<string>;
  decryptFromBytes: (encBuf: ArrayBuffer, key: SymmetricCryptoKey) => Promise<ArrayBuffer>;
  randomNumber: (min: number, max: number) => Promise<number>;
  validateKey: (key: SymmetricCryptoKey) => Promise<boolean>;
}
