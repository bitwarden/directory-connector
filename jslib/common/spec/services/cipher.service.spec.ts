import { Arg, Substitute, SubstituteOf } from "@fluffy-spoon/substitute";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { CryptoService } from "@/jslib/common/src/abstractions/crypto.service";
import { FileUploadService } from "@/jslib/common/src/abstractions/fileUpload.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { SearchService } from "@/jslib/common/src/abstractions/search.service";
import { SettingsService } from "@/jslib/common/src/abstractions/settings.service";
import { StateService } from "@/jslib/common/src/abstractions/state.service";
import { Utils } from "@/jslib/common/src/misc/utils";
import { Cipher } from "@/jslib/common/src/models/domain/cipher";
import { EncArrayBuffer } from "@/jslib/common/src/models/domain/encArrayBuffer";
import { EncString } from "@/jslib/common/src/models/domain/encString";
import { SymmetricCryptoKey } from "@/jslib/common/src/models/domain/symmetricCryptoKey";
import { CipherService } from "@/jslib/common/src/services/cipher.service";

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
      stateService,
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
