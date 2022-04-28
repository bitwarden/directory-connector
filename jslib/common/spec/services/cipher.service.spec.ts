import { Arg, Substitute, SubstituteOf } from "@fluffy-spoon/substitute";

import { ApiService } from "jslib-common/abstractions/api.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { FileUploadService } from "jslib-common/abstractions/fileUpload.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { SearchService } from "jslib-common/abstractions/search.service";
import { SettingsService } from "jslib-common/abstractions/settings.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { Utils } from "jslib-common/misc/utils";
import { Cipher } from "jslib-common/models/domain/cipher";
import { EncArrayBuffer } from "jslib-common/models/domain/encArrayBuffer";
import { EncString } from "jslib-common/models/domain/encString";
import { SymmetricCryptoKey } from "jslib-common/models/domain/symmetricCryptoKey";
import { CipherService } from "jslib-common/services/cipher.service";

const ENCRYPTED_TEXT = "This data has been encrypted";
const ENCRYPTED_BYTES = new EncArrayBuffer(Utils.fromUtf8ToArray(ENCRYPTED_TEXT).buffer);

describe("Cipher Service", () => {
  let cryptoService: SubstituteOf<CryptoService>;
  let stateService: SubstituteOf<StateService>;
  let settingsService: SubstituteOf<SettingsService>;
  let apiService: SubstituteOf<ApiService>;
  let fileUploadService: SubstituteOf<FileUploadService>;
  let i18nService: SubstituteOf<I18nService>;
  let searchService: SubstituteOf<SearchService>;
  let logService: SubstituteOf<LogService>;

  let cipherService: CipherService;

  beforeEach(() => {
    cryptoService = Substitute.for<CryptoService>();
    stateService = Substitute.for<StateService>();
    settingsService = Substitute.for<SettingsService>();
    apiService = Substitute.for<ApiService>();
    fileUploadService = Substitute.for<FileUploadService>();
    i18nService = Substitute.for<I18nService>();
    searchService = Substitute.for<SearchService>();
    logService = Substitute.for<LogService>();

    cryptoService.encryptToBytes(Arg.any(), Arg.any()).resolves(ENCRYPTED_BYTES);
    cryptoService.encrypt(Arg.any(), Arg.any()).resolves(new EncString(ENCRYPTED_TEXT));

    cipherService = new CipherService(
      cryptoService,
      settingsService,
      apiService,
      fileUploadService,
      i18nService,
      () => searchService,
      logService,
      stateService
    );
  });

  it("attachments upload encrypted file contents", async () => {
    const fileName = "filename";
    const fileData = new Uint8Array(10).buffer;
    cryptoService.getOrgKey(Arg.any()).resolves(new SymmetricCryptoKey(new Uint8Array(32).buffer));

    await cipherService.saveAttachmentRawWithServer(new Cipher(), fileName, fileData);

    fileUploadService
      .received(1)
      .uploadCipherAttachment(Arg.any(), Arg.any(), new EncString(ENCRYPTED_TEXT), ENCRYPTED_BYTES);
  });
});
