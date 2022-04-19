import { CipherType } from "../enums/cipherType";
import { UriMatchType } from "../enums/uriMatchType";
import { CipherData } from "../models/data/cipherData";
import { Cipher } from "../models/domain/cipher";
import { Field } from "../models/domain/field";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";
import { CipherView } from "../models/view/cipherView";
import { FieldView } from "../models/view/fieldView";

export abstract class CipherService {
  clearCache: (userId?: string) => Promise<void>;
  encrypt: (
    model: CipherView,
    key?: SymmetricCryptoKey,
    originalCipher?: Cipher
  ) => Promise<Cipher>;
  encryptFields: (fieldsModel: FieldView[], key: SymmetricCryptoKey) => Promise<Field[]>;
  encryptField: (fieldModel: FieldView, key: SymmetricCryptoKey) => Promise<Field>;
  get: (id: string) => Promise<Cipher>;
  getAll: () => Promise<Cipher[]>;
  getAllDecrypted: () => Promise<CipherView[]>;
  getAllDecryptedForGrouping: (groupingId: string, folder?: boolean) => Promise<CipherView[]>;
  getAllDecryptedForUrl: (
    url: string,
    includeOtherTypes?: CipherType[],
    defaultMatch?: UriMatchType
  ) => Promise<CipherView[]>;
  getAllFromApiForOrganization: (organizationId: string) => Promise<CipherView[]>;
  getLastUsedForUrl: (url: string, autofillOnPageLoad: boolean) => Promise<CipherView>;
  getLastLaunchedForUrl: (url: string, autofillOnPageLoad: boolean) => Promise<CipherView>;
  getNextCipherForUrl: (url: string) => Promise<CipherView>;
  updateLastUsedIndexForUrl: (url: string) => void;
  updateLastUsedDate: (id: string) => Promise<void>;
  updateLastLaunchedDate: (id: string) => Promise<void>;
  saveNeverDomain: (domain: string) => Promise<void>;
  saveWithServer: (cipher: Cipher) => Promise<any>;
  shareWithServer: (
    cipher: CipherView,
    organizationId: string,
    collectionIds: string[]
  ) => Promise<any>;
  shareManyWithServer: (
    ciphers: CipherView[],
    organizationId: string,
    collectionIds: string[]
  ) => Promise<any>;
  saveAttachmentWithServer: (
    cipher: Cipher,
    unencryptedFile: any,
    admin?: boolean
  ) => Promise<Cipher>;
  saveAttachmentRawWithServer: (
    cipher: Cipher,
    filename: string,
    data: ArrayBuffer,
    admin?: boolean
  ) => Promise<Cipher>;
  saveCollectionsWithServer: (cipher: Cipher) => Promise<any>;
  upsert: (cipher: CipherData | CipherData[]) => Promise<any>;
  replace: (ciphers: { [id: string]: CipherData }) => Promise<any>;
  clear: (userId: string) => Promise<any>;
  moveManyWithServer: (ids: string[], folderId: string) => Promise<any>;
  delete: (id: string | string[]) => Promise<any>;
  deleteWithServer: (id: string) => Promise<any>;
  deleteManyWithServer: (ids: string[]) => Promise<any>;
  deleteAttachment: (id: string, attachmentId: string) => Promise<void>;
  deleteAttachmentWithServer: (id: string, attachmentId: string) => Promise<void>;
  sortCiphersByLastUsed: (a: any, b: any) => number;
  sortCiphersByLastUsedThenName: (a: any, b: any) => number;
  getLocaleSortingFunction: () => (a: CipherView, b: CipherView) => number;
  softDelete: (id: string | string[]) => Promise<any>;
  softDeleteWithServer: (id: string) => Promise<any>;
  softDeleteManyWithServer: (ids: string[]) => Promise<any>;
  restore: (
    cipher: { id: string; revisionDate: string } | { id: string; revisionDate: string }[]
  ) => Promise<any>;
  restoreWithServer: (id: string) => Promise<any>;
  restoreManyWithServer: (ids: string[]) => Promise<any>;
}
