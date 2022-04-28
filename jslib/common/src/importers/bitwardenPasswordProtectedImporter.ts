import { CryptoService } from "../abstractions/crypto.service";
import { I18nService } from "../abstractions/i18n.service";
import { KdfType } from "../enums/kdfType";
import { EncString } from "../models/domain/encString";
import { ImportResult } from "../models/domain/importResult";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";

import { BitwardenJsonImporter } from "./bitwardenJsonImporter";
import { Importer } from "./importer";

interface BitwardenPasswordProtectedFileFormat {
  encrypted: boolean;
  passwordProtected: boolean;
  salt: string;
  kdfIterations: number;
  kdfType: number;
  encKeyValidation_DO_NOT_EDIT: string;
  data: string;
}

export class BitwardenPasswordProtectedImporter extends BitwardenJsonImporter implements Importer {
  private key: SymmetricCryptoKey;

  constructor(cryptoService: CryptoService, i18nService: I18nService, private password: string) {
    super(cryptoService, i18nService);
  }

  async parse(data: string): Promise<ImportResult> {
    const result = new ImportResult();
    const parsedData = JSON.parse(data);
    if (this.cannotParseFile(parsedData)) {
      result.success = false;
      return result;
    }

    if (!(await this.checkPassword(parsedData))) {
      result.success = false;
      result.errorMessage = this.i18nService.t("importEncKeyError");
      return result;
    }

    const encData = new EncString(parsedData.data);
    const clearTextData = await this.cryptoService.decryptToUtf8(encData, this.key);
    return await super.parse(clearTextData);
  }

  private async checkPassword(jdoc: BitwardenPasswordProtectedFileFormat): Promise<boolean> {
    this.key = await this.cryptoService.makePinKey(
      this.password,
      jdoc.salt,
      KdfType.PBKDF2_SHA256,
      jdoc.kdfIterations
    );

    const encKeyValidation = new EncString(jdoc.encKeyValidation_DO_NOT_EDIT);

    const encKeyValidationDecrypt = await this.cryptoService.decryptToUtf8(
      encKeyValidation,
      this.key
    );
    if (encKeyValidationDecrypt === null) {
      return false;
    }
    return true;
  }

  private cannotParseFile(jdoc: BitwardenPasswordProtectedFileFormat): boolean {
    return (
      !jdoc ||
      !jdoc.encrypted ||
      !jdoc.passwordProtected ||
      !jdoc.salt ||
      !jdoc.kdfIterations ||
      typeof jdoc.kdfIterations !== "number" ||
      jdoc.kdfType == null ||
      KdfType[jdoc.kdfType] == null ||
      !jdoc.encKeyValidation_DO_NOT_EDIT ||
      !jdoc.data
    );
  }
}
