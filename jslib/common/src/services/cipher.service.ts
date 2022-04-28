import { ApiService } from "../abstractions/api.service";
import { CipherService as CipherServiceAbstraction } from "../abstractions/cipher.service";
import { CryptoService } from "../abstractions/crypto.service";
import { FileUploadService } from "../abstractions/fileUpload.service";
import { I18nService } from "../abstractions/i18n.service";
import { LogService } from "../abstractions/log.service";
import { SearchService } from "../abstractions/search.service";
import { SettingsService } from "../abstractions/settings.service";
import { StateService } from "../abstractions/state.service";
import { CipherType } from "../enums/cipherType";
import { FieldType } from "../enums/fieldType";
import { UriMatchType } from "../enums/uriMatchType";
import { sequentialize } from "../misc/sequentialize";
import { Utils } from "../misc/utils";
import { CipherData } from "../models/data/cipherData";
import { Attachment } from "../models/domain/attachment";
import { Card } from "../models/domain/card";
import { Cipher } from "../models/domain/cipher";
import Domain from "../models/domain/domainBase";
import { EncArrayBuffer } from "../models/domain/encArrayBuffer";
import { EncString } from "../models/domain/encString";
import { Field } from "../models/domain/field";
import { Identity } from "../models/domain/identity";
import { Login } from "../models/domain/login";
import { LoginUri } from "../models/domain/loginUri";
import { Password } from "../models/domain/password";
import { SecureNote } from "../models/domain/secureNote";
import { SortedCiphersCache } from "../models/domain/sortedCiphersCache";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";
import { AttachmentRequest } from "../models/request/attachmentRequest";
import { CipherBulkDeleteRequest } from "../models/request/cipherBulkDeleteRequest";
import { CipherBulkMoveRequest } from "../models/request/cipherBulkMoveRequest";
import { CipherBulkRestoreRequest } from "../models/request/cipherBulkRestoreRequest";
import { CipherBulkShareRequest } from "../models/request/cipherBulkShareRequest";
import { CipherCollectionsRequest } from "../models/request/cipherCollectionsRequest";
import { CipherCreateRequest } from "../models/request/cipherCreateRequest";
import { CipherRequest } from "../models/request/cipherRequest";
import { CipherShareRequest } from "../models/request/cipherShareRequest";
import { CipherResponse } from "../models/response/cipherResponse";
import { ErrorResponse } from "../models/response/errorResponse";
import { AttachmentView } from "../models/view/attachmentView";
import { CipherView } from "../models/view/cipherView";
import { FieldView } from "../models/view/fieldView";
import { PasswordHistoryView } from "../models/view/passwordHistoryView";
import { View } from "../models/view/view";

const DomainMatchBlacklist = new Map<string, Set<string>>([
  ["google.com", new Set(["script.google.com"])],
]);

export class CipherService implements CipherServiceAbstraction {
  private sortedCiphersCache: SortedCiphersCache = new SortedCiphersCache(
    this.sortCiphersByLastUsed
  );

  constructor(
    private cryptoService: CryptoService,
    private settingsService: SettingsService,
    private apiService: ApiService,
    private fileUploadService: FileUploadService,
    private i18nService: I18nService,
    private searchService: () => SearchService,
    private logService: LogService,
    private stateService: StateService
  ) {}

  async getDecryptedCipherCache(): Promise<CipherView[]> {
    const decryptedCiphers = await this.stateService.getDecryptedCiphers();
    return decryptedCiphers;
  }

  async setDecryptedCipherCache(value: CipherView[]) {
    await this.stateService.setDecryptedCiphers(value);
    if (this.searchService != null) {
      if (value == null) {
        this.searchService().clearIndex();
      } else {
        this.searchService().indexCiphers();
      }
    }
  }

  async clearCache(userId?: string): Promise<void> {
    await this.clearDecryptedCiphersState(userId);
  }

  async encrypt(
    model: CipherView,
    key?: SymmetricCryptoKey,
    originalCipher: Cipher = null
  ): Promise<Cipher> {
    // Adjust password history
    if (model.id != null) {
      if (originalCipher == null) {
        originalCipher = await this.get(model.id);
      }
      if (originalCipher != null) {
        const existingCipher = await originalCipher.decrypt();
        model.passwordHistory = existingCipher.passwordHistory || [];
        if (model.type === CipherType.Login && existingCipher.type === CipherType.Login) {
          if (
            existingCipher.login.password != null &&
            existingCipher.login.password !== "" &&
            existingCipher.login.password !== model.login.password
          ) {
            const ph = new PasswordHistoryView();
            ph.password = existingCipher.login.password;
            ph.lastUsedDate = model.login.passwordRevisionDate = new Date();
            model.passwordHistory.splice(0, 0, ph);
          } else {
            model.login.passwordRevisionDate = existingCipher.login.passwordRevisionDate;
          }
        }
        if (existingCipher.hasFields) {
          const existingHiddenFields = existingCipher.fields.filter(
            (f) =>
              f.type === FieldType.Hidden &&
              f.name != null &&
              f.name !== "" &&
              f.value != null &&
              f.value !== ""
          );
          const hiddenFields =
            model.fields == null
              ? []
              : model.fields.filter(
                  (f) => f.type === FieldType.Hidden && f.name != null && f.name !== ""
                );
          existingHiddenFields.forEach((ef) => {
            const matchedField = hiddenFields.find((f) => f.name === ef.name);
            if (matchedField == null || matchedField.value !== ef.value) {
              const ph = new PasswordHistoryView();
              ph.password = ef.name + ": " + ef.value;
              ph.lastUsedDate = new Date();
              model.passwordHistory.splice(0, 0, ph);
            }
          });
        }
      }
      if (model.passwordHistory != null && model.passwordHistory.length === 0) {
        model.passwordHistory = null;
      } else if (model.passwordHistory != null && model.passwordHistory.length > 5) {
        // only save last 5 history
        model.passwordHistory = model.passwordHistory.slice(0, 5);
      }
    }

    const cipher = new Cipher();
    cipher.id = model.id;
    cipher.folderId = model.folderId;
    cipher.favorite = model.favorite;
    cipher.organizationId = model.organizationId;
    cipher.type = model.type;
    cipher.collectionIds = model.collectionIds;
    cipher.revisionDate = model.revisionDate;
    cipher.reprompt = model.reprompt;

    if (key == null && cipher.organizationId != null) {
      key = await this.cryptoService.getOrgKey(cipher.organizationId);
      if (key == null) {
        throw new Error("Cannot encrypt cipher for organization. No key.");
      }
    }
    await Promise.all([
      this.encryptObjProperty(
        model,
        cipher,
        {
          name: null,
          notes: null,
        },
        key
      ),
      this.encryptCipherData(cipher, model, key),
      this.encryptFields(model.fields, key).then((fields) => {
        cipher.fields = fields;
      }),
      this.encryptPasswordHistories(model.passwordHistory, key).then((ph) => {
        cipher.passwordHistory = ph;
      }),
      this.encryptAttachments(model.attachments, key).then((attachments) => {
        cipher.attachments = attachments;
      }),
    ]);

    return cipher;
  }

  async encryptAttachments(
    attachmentsModel: AttachmentView[],
    key: SymmetricCryptoKey
  ): Promise<Attachment[]> {
    if (attachmentsModel == null || attachmentsModel.length === 0) {
      return null;
    }

    const promises: Promise<any>[] = [];
    const encAttachments: Attachment[] = [];
    attachmentsModel.forEach(async (model) => {
      const attachment = new Attachment();
      attachment.id = model.id;
      attachment.size = model.size;
      attachment.sizeName = model.sizeName;
      attachment.url = model.url;
      const promise = this.encryptObjProperty(
        model,
        attachment,
        {
          fileName: null,
        },
        key
      ).then(async () => {
        if (model.key != null) {
          attachment.key = await this.cryptoService.encrypt(model.key.key, key);
        }
        encAttachments.push(attachment);
      });
      promises.push(promise);
    });

    await Promise.all(promises);
    return encAttachments;
  }

  async encryptFields(fieldsModel: FieldView[], key: SymmetricCryptoKey): Promise<Field[]> {
    if (!fieldsModel || !fieldsModel.length) {
      return null;
    }

    const self = this;
    const encFields: Field[] = [];
    await fieldsModel.reduce(async (promise, field) => {
      await promise;
      const encField = await self.encryptField(field, key);
      encFields.push(encField);
    }, Promise.resolve());

    return encFields;
  }

  async encryptField(fieldModel: FieldView, key: SymmetricCryptoKey): Promise<Field> {
    const field = new Field();
    field.type = fieldModel.type;
    field.linkedId = fieldModel.linkedId;
    // normalize boolean type field values
    if (fieldModel.type === FieldType.Boolean && fieldModel.value !== "true") {
      fieldModel.value = "false";
    }

    await this.encryptObjProperty(
      fieldModel,
      field,
      {
        name: null,
        value: null,
      },
      key
    );

    return field;
  }

  async encryptPasswordHistories(
    phModels: PasswordHistoryView[],
    key: SymmetricCryptoKey
  ): Promise<Password[]> {
    if (!phModels || !phModels.length) {
      return null;
    }

    const self = this;
    const encPhs: Password[] = [];
    await phModels.reduce(async (promise, ph) => {
      await promise;
      const encPh = await self.encryptPasswordHistory(ph, key);
      encPhs.push(encPh);
    }, Promise.resolve());

    return encPhs;
  }

  async encryptPasswordHistory(
    phModel: PasswordHistoryView,
    key: SymmetricCryptoKey
  ): Promise<Password> {
    const ph = new Password();
    ph.lastUsedDate = phModel.lastUsedDate;

    await this.encryptObjProperty(
      phModel,
      ph,
      {
        password: null,
      },
      key
    );

    return ph;
  }

  async get(id: string): Promise<Cipher> {
    const ciphers = await this.stateService.getEncryptedCiphers();
    // eslint-disable-next-line
    if (ciphers == null || !ciphers.hasOwnProperty(id)) {
      return null;
    }

    const localData = await this.stateService.getLocalData();
    return new Cipher(ciphers[id], localData ? localData[id] : null);
  }

  async getAll(): Promise<Cipher[]> {
    const localData = await this.stateService.getLocalData();
    const ciphers = await this.stateService.getEncryptedCiphers();
    const response: Cipher[] = [];
    for (const id in ciphers) {
      // eslint-disable-next-line
      if (ciphers.hasOwnProperty(id)) {
        response.push(new Cipher(ciphers[id], localData ? localData[id] : null));
      }
    }
    return response;
  }

  @sequentialize(() => "getAllDecrypted")
  async getAllDecrypted(): Promise<CipherView[]> {
    const userId = await this.stateService.getUserId();
    if ((await this.getDecryptedCipherCache()) != null) {
      if (
        this.searchService != null &&
        (this.searchService().indexedEntityId ?? userId) !== userId
      ) {
        await this.searchService().indexCiphers(userId, await this.getDecryptedCipherCache());
      }
      return await this.getDecryptedCipherCache();
    }

    const decCiphers: CipherView[] = [];
    const hasKey = await this.cryptoService.hasKey();
    if (!hasKey) {
      throw new Error("No key.");
    }

    const promises: any[] = [];
    const ciphers = await this.getAll();
    ciphers.forEach(async (cipher) => {
      promises.push(cipher.decrypt().then((c) => decCiphers.push(c)));
    });

    await Promise.all(promises);
    decCiphers.sort(this.getLocaleSortingFunction());
    await this.setDecryptedCipherCache(decCiphers);
    return decCiphers;
  }

  async getAllDecryptedForGrouping(groupingId: string, folder = true): Promise<CipherView[]> {
    const ciphers = await this.getAllDecrypted();

    return ciphers.filter((cipher) => {
      if (cipher.isDeleted) {
        return false;
      }
      if (folder && cipher.folderId === groupingId) {
        return true;
      } else if (
        !folder &&
        cipher.collectionIds != null &&
        cipher.collectionIds.indexOf(groupingId) > -1
      ) {
        return true;
      }

      return false;
    });
  }

  async getAllDecryptedForUrl(
    url: string,
    includeOtherTypes?: CipherType[],
    defaultMatch: UriMatchType = null
  ): Promise<CipherView[]> {
    if (url == null && includeOtherTypes == null) {
      return Promise.resolve([]);
    }

    const domain = Utils.getDomain(url);
    const eqDomainsPromise =
      domain == null
        ? Promise.resolve([])
        : this.settingsService.getEquivalentDomains().then((eqDomains: any[][]) => {
            let matches: any[] = [];
            eqDomains.forEach((eqDomain) => {
              if (eqDomain.length && eqDomain.indexOf(domain) >= 0) {
                matches = matches.concat(eqDomain);
              }
            });

            if (!matches.length) {
              matches.push(domain);
            }

            return matches;
          });

    const result = await Promise.all([eqDomainsPromise, this.getAllDecrypted()]);
    const matchingDomains = result[0];
    const ciphers = result[1];

    if (defaultMatch == null) {
      defaultMatch = await this.stateService.getDefaultUriMatch();
      if (defaultMatch == null) {
        defaultMatch = UriMatchType.Domain;
      }
    }

    return ciphers.filter((cipher) => {
      if (cipher.deletedDate != null) {
        return false;
      }
      if (includeOtherTypes != null && includeOtherTypes.indexOf(cipher.type) > -1) {
        return true;
      }

      if (url != null && cipher.type === CipherType.Login && cipher.login.uris != null) {
        for (let i = 0; i < cipher.login.uris.length; i++) {
          const u = cipher.login.uris[i];
          if (u.uri == null) {
            continue;
          }

          const match = u.match == null ? defaultMatch : u.match;
          switch (match) {
            case UriMatchType.Domain:
              if (domain != null && u.domain != null && matchingDomains.indexOf(u.domain) > -1) {
                if (DomainMatchBlacklist.has(u.domain)) {
                  const domainUrlHost = Utils.getHost(url);
                  if (!DomainMatchBlacklist.get(u.domain).has(domainUrlHost)) {
                    return true;
                  }
                } else {
                  return true;
                }
              }
              break;
            case UriMatchType.Host: {
              const urlHost = Utils.getHost(url);
              if (urlHost != null && urlHost === Utils.getHost(u.uri)) {
                return true;
              }
              break;
            }
            case UriMatchType.Exact:
              if (url === u.uri) {
                return true;
              }
              break;
            case UriMatchType.StartsWith:
              if (url.startsWith(u.uri)) {
                return true;
              }
              break;
            case UriMatchType.RegularExpression:
              try {
                const regex = new RegExp(u.uri, "i");
                if (regex.test(url)) {
                  return true;
                }
              } catch (e) {
                this.logService.error(e);
              }
              break;
            case UriMatchType.Never:
            default:
              break;
          }
        }
      }

      return false;
    });
  }

  async getAllFromApiForOrganization(organizationId: string): Promise<CipherView[]> {
    const ciphers = await this.apiService.getCiphersOrganization(organizationId);
    if (ciphers != null && ciphers.data != null && ciphers.data.length) {
      const decCiphers: CipherView[] = [];
      const promises: any[] = [];
      ciphers.data.forEach((r) => {
        const data = new CipherData(r);
        const cipher = new Cipher(data);
        promises.push(cipher.decrypt().then((c) => decCiphers.push(c)));
      });
      await Promise.all(promises);
      decCiphers.sort(this.getLocaleSortingFunction());
      return decCiphers;
    } else {
      return [];
    }
  }

  async getLastUsedForUrl(url: string, autofillOnPageLoad = false): Promise<CipherView> {
    return this.getCipherForUrl(url, true, false, autofillOnPageLoad);
  }

  async getLastLaunchedForUrl(url: string, autofillOnPageLoad = false): Promise<CipherView> {
    return this.getCipherForUrl(url, false, true, autofillOnPageLoad);
  }

  async getNextCipherForUrl(url: string): Promise<CipherView> {
    return this.getCipherForUrl(url, false, false, false);
  }

  updateLastUsedIndexForUrl(url: string) {
    this.sortedCiphersCache.updateLastUsedIndex(url);
  }

  async updateLastUsedDate(id: string): Promise<void> {
    let ciphersLocalData = await this.stateService.getLocalData();
    if (!ciphersLocalData) {
      ciphersLocalData = {};
    }

    if (ciphersLocalData[id]) {
      ciphersLocalData[id].lastUsedDate = new Date().getTime();
    } else {
      ciphersLocalData[id] = {
        lastUsedDate: new Date().getTime(),
      };
    }

    await this.stateService.setLocalData(ciphersLocalData);

    const decryptedCipherCache = await this.stateService.getDecryptedCiphers();
    if (!decryptedCipherCache) {
      return;
    }

    for (let i = 0; i < decryptedCipherCache.length; i++) {
      const cached = decryptedCipherCache[i];
      if (cached.id === id) {
        cached.localData = ciphersLocalData[id];
        break;
      }
    }
    await this.stateService.setDecryptedCiphers(decryptedCipherCache);
  }

  async updateLastLaunchedDate(id: string): Promise<void> {
    let ciphersLocalData = await this.stateService.getLocalData();
    if (!ciphersLocalData) {
      ciphersLocalData = {};
    }

    if (ciphersLocalData[id]) {
      ciphersLocalData[id].lastLaunched = new Date().getTime();
    } else {
      ciphersLocalData[id] = {
        lastUsedDate: new Date().getTime(),
      };
    }

    await this.stateService.setLocalData(ciphersLocalData);

    const decryptedCipherCache = await this.stateService.getDecryptedCiphers();
    if (!decryptedCipherCache) {
      return;
    }

    for (let i = 0; i < decryptedCipherCache.length; i++) {
      const cached = decryptedCipherCache[i];
      if (cached.id === id) {
        cached.localData = ciphersLocalData[id];
        break;
      }
    }
    await this.stateService.setDecryptedCiphers(decryptedCipherCache);
  }

  async saveNeverDomain(domain: string): Promise<void> {
    if (domain == null) {
      return;
    }

    let domains = await this.stateService.getNeverDomains();
    if (!domains) {
      domains = {};
    }
    domains[domain] = null;
    await this.stateService.setNeverDomains(domains);
  }

  async saveWithServer(cipher: Cipher): Promise<any> {
    let response: CipherResponse;
    if (cipher.id == null) {
      if (cipher.collectionIds != null) {
        const request = new CipherCreateRequest(cipher);
        response = await this.apiService.postCipherCreate(request);
      } else {
        const request = new CipherRequest(cipher);
        response = await this.apiService.postCipher(request);
      }
      cipher.id = response.id;
    } else {
      const request = new CipherRequest(cipher);
      response = await this.apiService.putCipher(cipher.id, request);
    }

    const data = new CipherData(
      response,
      await this.stateService.getUserId(),
      cipher.collectionIds
    );
    await this.upsert(data);
  }

  async shareWithServer(
    cipher: CipherView,
    organizationId: string,
    collectionIds: string[]
  ): Promise<any> {
    const attachmentPromises: Promise<any>[] = [];
    if (cipher.attachments != null) {
      cipher.attachments.forEach((attachment) => {
        if (attachment.key == null) {
          attachmentPromises.push(
            this.shareAttachmentWithServer(attachment, cipher.id, organizationId)
          );
        }
      });
    }
    await Promise.all(attachmentPromises);

    cipher.organizationId = organizationId;
    cipher.collectionIds = collectionIds;
    const encCipher = await this.encrypt(cipher);
    const request = new CipherShareRequest(encCipher);
    const response = await this.apiService.putShareCipher(cipher.id, request);
    const data = new CipherData(response, await this.stateService.getUserId(), collectionIds);
    await this.upsert(data);
  }

  async shareManyWithServer(
    ciphers: CipherView[],
    organizationId: string,
    collectionIds: string[]
  ): Promise<any> {
    const promises: Promise<any>[] = [];
    const encCiphers: Cipher[] = [];
    for (const cipher of ciphers) {
      cipher.organizationId = organizationId;
      cipher.collectionIds = collectionIds;
      promises.push(
        this.encrypt(cipher).then((c) => {
          encCiphers.push(c);
        })
      );
    }
    await Promise.all(promises);
    const request = new CipherBulkShareRequest(encCiphers, collectionIds);
    try {
      await this.apiService.putShareCiphers(request);
    } catch (e) {
      for (const cipher of ciphers) {
        cipher.organizationId = null;
        cipher.collectionIds = null;
      }
      throw e;
    }
    const userId = await this.stateService.getUserId();
    await this.upsert(encCiphers.map((c) => c.toCipherData(userId)));
  }

  saveAttachmentWithServer(cipher: Cipher, unencryptedFile: any, admin = false): Promise<Cipher> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(unencryptedFile);
      reader.onload = async (evt: any) => {
        try {
          const cData = await this.saveAttachmentRawWithServer(
            cipher,
            unencryptedFile.name,
            evt.target.result,
            admin
          );
          resolve(cData);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => {
        reject("Error reading file.");
      };
    });
  }

  async saveAttachmentRawWithServer(
    cipher: Cipher,
    filename: string,
    data: ArrayBuffer,
    admin = false
  ): Promise<Cipher> {
    const key = await this.cryptoService.getOrgKey(cipher.organizationId);
    const encFileName = await this.cryptoService.encrypt(filename, key);

    const dataEncKey = await this.cryptoService.makeEncKey(key);
    const encData = await this.cryptoService.encryptToBytes(data, dataEncKey[0]);

    const request: AttachmentRequest = {
      key: dataEncKey[1].encryptedString,
      fileName: encFileName.encryptedString,
      fileSize: encData.buffer.byteLength,
      adminRequest: admin,
    };

    let response: CipherResponse;
    try {
      const uploadDataResponse = await this.apiService.postCipherAttachment(cipher.id, request);
      response = admin ? uploadDataResponse.cipherMiniResponse : uploadDataResponse.cipherResponse;
      await this.fileUploadService.uploadCipherAttachment(
        admin,
        uploadDataResponse,
        encFileName,
        encData
      );
    } catch (e) {
      if (
        (e instanceof ErrorResponse && (e as ErrorResponse).statusCode === 404) ||
        (e as ErrorResponse).statusCode === 405
      ) {
        response = await this.legacyServerAttachmentFileUpload(
          admin,
          cipher.id,
          encFileName,
          encData,
          dataEncKey[1]
        );
      } else if (e instanceof ErrorResponse) {
        throw new Error((e as ErrorResponse).getSingleMessage());
      } else {
        throw e;
      }
    }

    const cData = new CipherData(
      response,
      await this.stateService.getUserId(),
      cipher.collectionIds
    );
    if (!admin) {
      await this.upsert(cData);
    }
    return new Cipher(cData);
  }

  /**
   * @deprecated Mar 25 2021: This method has been deprecated in favor of direct uploads.
   * This method still exists for backward compatibility with old server versions.
   */
  async legacyServerAttachmentFileUpload(
    admin: boolean,
    cipherId: string,
    encFileName: EncString,
    encData: EncArrayBuffer,
    key: EncString
  ) {
    const fd = new FormData();
    try {
      const blob = new Blob([encData.buffer], { type: "application/octet-stream" });
      fd.append("key", key.encryptedString);
      fd.append("data", blob, encFileName.encryptedString);
    } catch (e) {
      if (Utils.isNode && !Utils.isBrowser) {
        fd.append("key", key.encryptedString);
        fd.append(
          "data",
          Buffer.from(encData.buffer) as any,
          {
            filepath: encFileName.encryptedString,
            contentType: "application/octet-stream",
          } as any
        );
      } else {
        throw e;
      }
    }

    let response: CipherResponse;
    try {
      if (admin) {
        response = await this.apiService.postCipherAttachmentAdminLegacy(cipherId, fd);
      } else {
        response = await this.apiService.postCipherAttachmentLegacy(cipherId, fd);
      }
    } catch (e) {
      throw new Error((e as ErrorResponse).getSingleMessage());
    }

    return response;
  }

  async saveCollectionsWithServer(cipher: Cipher): Promise<any> {
    const request = new CipherCollectionsRequest(cipher.collectionIds);
    await this.apiService.putCipherCollections(cipher.id, request);
    const data = cipher.toCipherData(await this.stateService.getUserId());
    await this.upsert(data);
  }

  async upsert(cipher: CipherData | CipherData[]): Promise<any> {
    let ciphers = await this.stateService.getEncryptedCiphers();
    if (ciphers == null) {
      ciphers = {};
    }

    if (cipher instanceof CipherData) {
      const c = cipher as CipherData;
      ciphers[c.id] = c;
    } else {
      (cipher as CipherData[]).forEach((c) => {
        ciphers[c.id] = c;
      });
    }

    await this.replace(ciphers);
  }

  async replace(ciphers: { [id: string]: CipherData }): Promise<any> {
    await this.clearDecryptedCiphersState();
    await this.stateService.setEncryptedCiphers(ciphers);
  }

  async clear(userId?: string): Promise<any> {
    await this.clearEncryptedCiphersState(userId);
    await this.clearCache(userId);
  }

  async moveManyWithServer(ids: string[], folderId: string): Promise<any> {
    await this.apiService.putMoveCiphers(new CipherBulkMoveRequest(ids, folderId));

    let ciphers = await this.stateService.getEncryptedCiphers();
    if (ciphers == null) {
      ciphers = {};
    }

    ids.forEach((id) => {
      // eslint-disable-next-line
      if (ciphers.hasOwnProperty(id)) {
        ciphers[id].folderId = folderId;
      }
    });

    await this.clearCache();
    await this.stateService.setEncryptedCiphers(ciphers);
  }

  async delete(id: string | string[]): Promise<any> {
    const ciphers = await this.stateService.getEncryptedCiphers();
    if (ciphers == null) {
      return;
    }

    if (typeof id === "string") {
      if (ciphers[id] == null) {
        return;
      }
      delete ciphers[id];
    } else {
      (id as string[]).forEach((i) => {
        delete ciphers[i];
      });
    }

    await this.clearCache();
    await this.stateService.setEncryptedCiphers(ciphers);
  }

  async deleteWithServer(id: string): Promise<any> {
    await this.apiService.deleteCipher(id);
    await this.delete(id);
  }

  async deleteManyWithServer(ids: string[]): Promise<any> {
    await this.apiService.deleteManyCiphers(new CipherBulkDeleteRequest(ids));
    await this.delete(ids);
  }

  async deleteAttachment(id: string, attachmentId: string): Promise<void> {
    const ciphers = await this.stateService.getEncryptedCiphers();

    // eslint-disable-next-line
    if (ciphers == null || !ciphers.hasOwnProperty(id) || ciphers[id].attachments == null) {
      return;
    }

    for (let i = 0; i < ciphers[id].attachments.length; i++) {
      if (ciphers[id].attachments[i].id === attachmentId) {
        ciphers[id].attachments.splice(i, 1);
      }
    }

    await this.clearCache();
    await this.stateService.setEncryptedCiphers(ciphers);
  }

  async deleteAttachmentWithServer(id: string, attachmentId: string): Promise<void> {
    try {
      await this.apiService.deleteCipherAttachment(id, attachmentId);
    } catch (e) {
      return Promise.reject((e as ErrorResponse).getSingleMessage());
    }
    await this.deleteAttachment(id, attachmentId);
  }

  sortCiphersByLastUsed(a: CipherView, b: CipherView): number {
    const aLastUsed =
      a.localData && a.localData.lastUsedDate ? (a.localData.lastUsedDate as number) : null;
    const bLastUsed =
      b.localData && b.localData.lastUsedDate ? (b.localData.lastUsedDate as number) : null;

    const bothNotNull = aLastUsed != null && bLastUsed != null;
    if (bothNotNull && aLastUsed < bLastUsed) {
      return 1;
    }
    if (aLastUsed != null && bLastUsed == null) {
      return -1;
    }

    if (bothNotNull && aLastUsed > bLastUsed) {
      return -1;
    }
    if (bLastUsed != null && aLastUsed == null) {
      return 1;
    }

    return 0;
  }

  sortCiphersByLastUsedThenName(a: CipherView, b: CipherView): number {
    const result = this.sortCiphersByLastUsed(a, b);
    if (result !== 0) {
      return result;
    }

    return this.getLocaleSortingFunction()(a, b);
  }

  getLocaleSortingFunction(): (a: CipherView, b: CipherView) => number {
    return (a, b) => {
      let aName = a.name;
      let bName = b.name;

      if (aName == null && bName != null) {
        return -1;
      }
      if (aName != null && bName == null) {
        return 1;
      }
      if (aName == null && bName == null) {
        return 0;
      }

      const result = this.i18nService.collator
        ? this.i18nService.collator.compare(aName, bName)
        : aName.localeCompare(bName);

      if (result !== 0 || a.type !== CipherType.Login || b.type !== CipherType.Login) {
        return result;
      }

      if (a.login.username != null) {
        aName += a.login.username;
      }

      if (b.login.username != null) {
        bName += b.login.username;
      }

      return this.i18nService.collator
        ? this.i18nService.collator.compare(aName, bName)
        : aName.localeCompare(bName);
    };
  }

  async softDelete(id: string | string[]): Promise<any> {
    const ciphers = await this.stateService.getEncryptedCiphers();
    if (ciphers == null) {
      return;
    }

    const setDeletedDate = (cipherId: string) => {
      if (ciphers[cipherId] == null) {
        return;
      }
      ciphers[cipherId].deletedDate = new Date().toISOString();
    };

    if (typeof id === "string") {
      setDeletedDate(id);
    } else {
      (id as string[]).forEach(setDeletedDate);
    }

    await this.clearCache();
    await this.stateService.setEncryptedCiphers(ciphers);
  }

  async softDeleteWithServer(id: string): Promise<any> {
    await this.apiService.putDeleteCipher(id);
    await this.softDelete(id);
  }

  async softDeleteManyWithServer(ids: string[]): Promise<any> {
    await this.apiService.putDeleteManyCiphers(new CipherBulkDeleteRequest(ids));
    await this.softDelete(ids);
  }

  async restore(
    cipher: { id: string; revisionDate: string } | { id: string; revisionDate: string }[]
  ) {
    const ciphers = await this.stateService.getEncryptedCiphers();
    if (ciphers == null) {
      return;
    }

    const clearDeletedDate = (c: { id: string; revisionDate: string }) => {
      if (ciphers[c.id] == null) {
        return;
      }
      ciphers[c.id].deletedDate = null;
      ciphers[c.id].revisionDate = c.revisionDate;
    };

    if (cipher.constructor.name === Array.name) {
      (cipher as { id: string; revisionDate: string }[]).forEach(clearDeletedDate);
    } else {
      clearDeletedDate(cipher as { id: string; revisionDate: string });
    }

    await this.clearCache();
    await this.stateService.setEncryptedCiphers(ciphers);
  }

  async restoreWithServer(id: string): Promise<any> {
    const response = await this.apiService.putRestoreCipher(id);
    await this.restore({ id: id, revisionDate: response.revisionDate });
  }

  async restoreManyWithServer(ids: string[]): Promise<any> {
    const response = await this.apiService.putRestoreManyCiphers(new CipherBulkRestoreRequest(ids));
    const restores: { id: string; revisionDate: string }[] = [];
    for (const cipher of response.data) {
      restores.push({ id: cipher.id, revisionDate: cipher.revisionDate });
    }
    await this.restore(restores);
  }

  // Helpers

  private async shareAttachmentWithServer(
    attachmentView: AttachmentView,
    cipherId: string,
    organizationId: string
  ): Promise<any> {
    const attachmentResponse = await this.apiService.nativeFetch(
      new Request(attachmentView.url, { cache: "no-store" })
    );
    if (attachmentResponse.status !== 200) {
      throw Error("Failed to download attachment: " + attachmentResponse.status.toString());
    }

    const buf = await attachmentResponse.arrayBuffer();
    const decBuf = await this.cryptoService.decryptFromBytes(buf, null);
    const key = await this.cryptoService.getOrgKey(organizationId);
    const encFileName = await this.cryptoService.encrypt(attachmentView.fileName, key);

    const dataEncKey = await this.cryptoService.makeEncKey(key);
    const encData = await this.cryptoService.encryptToBytes(decBuf, dataEncKey[0]);

    const fd = new FormData();
    try {
      const blob = new Blob([encData.buffer], { type: "application/octet-stream" });
      fd.append("key", dataEncKey[1].encryptedString);
      fd.append("data", blob, encFileName.encryptedString);
    } catch (e) {
      if (Utils.isNode && !Utils.isBrowser) {
        fd.append("key", dataEncKey[1].encryptedString);
        fd.append(
          "data",
          Buffer.from(encData.buffer) as any,
          {
            filepath: encFileName.encryptedString,
            contentType: "application/octet-stream",
          } as any
        );
      } else {
        throw e;
      }
    }

    try {
      await this.apiService.postShareCipherAttachment(
        cipherId,
        attachmentView.id,
        fd,
        organizationId
      );
    } catch (e) {
      throw new Error((e as ErrorResponse).getSingleMessage());
    }
  }

  private async encryptObjProperty<V extends View, D extends Domain>(
    model: V,
    obj: D,
    map: any,
    key: SymmetricCryptoKey
  ): Promise<void> {
    const promises = [];
    const self = this;

    for (const prop in map) {
      // eslint-disable-next-line
      if (!map.hasOwnProperty(prop)) {
        continue;
      }

      (function (theProp, theObj) {
        const p = Promise.resolve()
          .then(() => {
            const modelProp = (model as any)[map[theProp] || theProp];
            if (modelProp && modelProp !== "") {
              return self.cryptoService.encrypt(modelProp, key);
            }
            return null;
          })
          .then((val: EncString) => {
            (theObj as any)[theProp] = val;
          });
        promises.push(p);
      })(prop, obj);
    }

    await Promise.all(promises);
  }

  private async encryptCipherData(cipher: Cipher, model: CipherView, key: SymmetricCryptoKey) {
    switch (cipher.type) {
      case CipherType.Login:
        cipher.login = new Login();
        cipher.login.passwordRevisionDate = model.login.passwordRevisionDate;
        cipher.login.autofillOnPageLoad = model.login.autofillOnPageLoad;
        await this.encryptObjProperty(
          model.login,
          cipher.login,
          {
            username: null,
            password: null,
            totp: null,
          },
          key
        );

        if (model.login.uris != null) {
          cipher.login.uris = [];
          for (let i = 0; i < model.login.uris.length; i++) {
            const loginUri = new LoginUri();
            loginUri.match = model.login.uris[i].match;
            await this.encryptObjProperty(
              model.login.uris[i],
              loginUri,
              {
                uri: null,
              },
              key
            );
            cipher.login.uris.push(loginUri);
          }
        }
        return;
      case CipherType.SecureNote:
        cipher.secureNote = new SecureNote();
        cipher.secureNote.type = model.secureNote.type;
        return;
      case CipherType.Card:
        cipher.card = new Card();
        await this.encryptObjProperty(
          model.card,
          cipher.card,
          {
            cardholderName: null,
            brand: null,
            number: null,
            expMonth: null,
            expYear: null,
            code: null,
          },
          key
        );
        return;
      case CipherType.Identity:
        cipher.identity = new Identity();
        await this.encryptObjProperty(
          model.identity,
          cipher.identity,
          {
            title: null,
            firstName: null,
            middleName: null,
            lastName: null,
            address1: null,
            address2: null,
            address3: null,
            city: null,
            state: null,
            postalCode: null,
            country: null,
            company: null,
            email: null,
            phone: null,
            ssn: null,
            username: null,
            passportNumber: null,
            licenseNumber: null,
          },
          key
        );
        return;
      default:
        throw new Error("Unknown cipher type.");
    }
  }

  private async getCipherForUrl(
    url: string,
    lastUsed: boolean,
    lastLaunched: boolean,
    autofillOnPageLoad: boolean
  ): Promise<CipherView> {
    const cacheKey = autofillOnPageLoad ? "autofillOnPageLoad-" + url : url;

    if (!this.sortedCiphersCache.isCached(cacheKey)) {
      let ciphers = await this.getAllDecryptedForUrl(url);
      if (!ciphers) {
        return null;
      }

      if (autofillOnPageLoad) {
        const autofillOnPageLoadDefault = await this.stateService.getAutoFillOnPageLoadDefault();
        ciphers = ciphers.filter(
          (cipher) =>
            cipher.login.autofillOnPageLoad ||
            (cipher.login.autofillOnPageLoad == null && autofillOnPageLoadDefault !== false)
        );
        if (ciphers.length === 0) {
          return null;
        }
      }

      this.sortedCiphersCache.addCiphers(cacheKey, ciphers);
    }

    if (lastLaunched) {
      return this.sortedCiphersCache.getLastLaunched(cacheKey);
    } else if (lastUsed) {
      return this.sortedCiphersCache.getLastUsed(cacheKey);
    } else {
      return this.sortedCiphersCache.getNext(cacheKey);
    }
  }

  private async clearEncryptedCiphersState(userId?: string) {
    await this.stateService.setEncryptedCiphers(null, { userId: userId });
  }

  private async clearDecryptedCiphersState(userId?: string) {
    await this.stateService.setDecryptedCiphers(null, { userId: userId });
    this.clearSortedCiphers();
  }

  private clearSortedCiphers() {
    this.sortedCiphersCache.clear();
  }
}
