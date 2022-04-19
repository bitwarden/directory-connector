import Substitute, { Arg, SubstituteOf } from "@fluffy-spoon/substitute";

import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { KdfType } from "jslib-common/enums/kdfType";
import { BitwardenPasswordProtectedImporter } from "jslib-common/importers/bitwardenPasswordProtectedImporter";
import { Utils } from "jslib-common/misc/utils";
import { ImportResult } from "jslib-common/models/domain/importResult";

import { data as emptyDecryptedData } from "./testData/bitwardenJson/empty.json";

describe("BitwardenPasswordProtectedImporter", () => {
  let importer: BitwardenPasswordProtectedImporter;
  let cryptoService: SubstituteOf<CryptoService>;
  let i18nService: SubstituteOf<I18nService>;
  const password = Utils.newGuid();
  const result = new ImportResult();
  let jDoc: {
    encrypted?: boolean;
    passwordProtected?: boolean;
    salt?: string;
    kdfIterations?: any;
    kdfType?: any;
    encKeyValidation_DO_NOT_EDIT?: string;
    data?: string;
  };

  beforeEach(() => {
    cryptoService = Substitute.for<CryptoService>();
    i18nService = Substitute.for<I18nService>();

    jDoc = {
      encrypted: true,
      passwordProtected: true,
      salt: "c2FsdA==",
      kdfIterations: 100000,
      kdfType: KdfType.PBKDF2_SHA256,
      encKeyValidation_DO_NOT_EDIT: Utils.newGuid(),
      data: Utils.newGuid(),
    };

    result.success = true;
    importer = new BitwardenPasswordProtectedImporter(cryptoService, i18nService, password);
  });

  describe("Required Json Data", () => {
    it("succeeds with default jdoc", async () => {
      cryptoService.decryptToUtf8(Arg.any(), Arg.any()).resolves(emptyDecryptedData);

      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(true);
    });

    it("fails if encrypted === false", async () => {
      jDoc.encrypted = false;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if encrypted === null", async () => {
      jDoc.encrypted = null;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if passwordProtected === false", async () => {
      jDoc.passwordProtected = false;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if passwordProtected === null", async () => {
      jDoc.passwordProtected = null;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if salt === null", async () => {
      jDoc.salt = null;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if kdfIterations === null", async () => {
      jDoc.kdfIterations = null;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if kdfIterations is not a number", async () => {
      jDoc.kdfIterations = "not a number";
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if kdfType === null", async () => {
      jDoc.kdfType = null;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if kdfType is not a string", async () => {
      jDoc.kdfType = "not a valid kdf type";
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if kdfType is not a known kdfType", async () => {
      jDoc.kdfType = -1;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if encKeyValidation_DO_NOT_EDIT === null", async () => {
      jDoc.encKeyValidation_DO_NOT_EDIT = null;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });

    it("fails if data === null", async () => {
      jDoc.data = null;
      expect((await importer.parse(JSON.stringify(jDoc))).success).toEqual(false);
    });
  });
});
