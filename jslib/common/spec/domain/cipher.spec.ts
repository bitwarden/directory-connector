import Substitute, { Arg } from "@fluffy-spoon/substitute";

import { CipherRepromptType } from "jslib-common/enums/cipherRepromptType";
import { CipherType } from "jslib-common/enums/cipherType";
import { FieldType } from "jslib-common/enums/fieldType";
import { SecureNoteType } from "jslib-common/enums/secureNoteType";
import { UriMatchType } from "jslib-common/enums/uriMatchType";
import { CipherData } from "jslib-common/models/data/cipherData";
import { Card } from "jslib-common/models/domain/card";
import { Cipher } from "jslib-common/models/domain/cipher";
import { Identity } from "jslib-common/models/domain/identity";
import { Login } from "jslib-common/models/domain/login";
import { SecureNote } from "jslib-common/models/domain/secureNote";
import { CardView } from "jslib-common/models/view/cardView";
import { IdentityView } from "jslib-common/models/view/identityView";
import { LoginView } from "jslib-common/models/view/loginView";

import { mockEnc } from "../utils";

describe("Cipher DTO", () => {
  it("Convert from empty CipherData", () => {
    const data = new CipherData();
    const cipher = new Cipher(data);

    expect(cipher).toEqual({
      id: null,
      userId: null,
      organizationId: null,
      folderId: null,
      name: null,
      notes: null,
      type: undefined,
      favorite: undefined,
      organizationUseTotp: undefined,
      edit: undefined,
      viewPassword: true,
      revisionDate: null,
      collectionIds: undefined,
      localData: null,
      deletedDate: null,
      reprompt: undefined,
      attachments: null,
      fields: null,
      passwordHistory: null,
    });
  });

  describe("LoginCipher", () => {
    let cipherData: CipherData;

    beforeEach(() => {
      cipherData = {
        id: "id",
        organizationId: "orgId",
        folderId: "folderId",
        userId: "userId",
        edit: true,
        viewPassword: true,
        organizationUseTotp: true,
        favorite: false,
        revisionDate: "2022-01-31T12:00:00.000Z",
        type: CipherType.Login,
        name: "EncryptedString",
        notes: "EncryptedString",
        deletedDate: null,
        reprompt: CipherRepromptType.None,
        login: {
          uris: [{ uri: "EncryptedString", match: UriMatchType.Domain }],
          username: "EncryptedString",
          password: "EncryptedString",
          passwordRevisionDate: "2022-01-31T12:00:00.000Z",
          totp: "EncryptedString",
          autofillOnPageLoad: false,
        },
        passwordHistory: [
          { password: "EncryptedString", lastUsedDate: "2022-01-31T12:00:00.000Z" },
        ],
        attachments: [
          {
            id: "a1",
            url: "url",
            size: "1100",
            sizeName: "1.1 KB",
            fileName: "file",
            key: "EncKey",
          },
          {
            id: "a2",
            url: "url",
            size: "1100",
            sizeName: "1.1 KB",
            fileName: "file",
            key: "EncKey",
          },
        ],
        fields: [
          {
            name: "EncryptedString",
            value: "EncryptedString",
            type: FieldType.Text,
            linkedId: null,
          },
          {
            name: "EncryptedString",
            value: "EncryptedString",
            type: FieldType.Hidden,
            linkedId: null,
          },
        ],
      };
    });

    it("Convert", () => {
      const cipher = new Cipher(cipherData);

      expect(cipher).toEqual({
        id: "id",
        userId: "userId",
        organizationId: "orgId",
        folderId: "folderId",
        name: { encryptedString: "EncryptedString", encryptionType: 0 },
        notes: { encryptedString: "EncryptedString", encryptionType: 0 },
        type: 1,
        favorite: false,
        organizationUseTotp: true,
        edit: true,
        viewPassword: true,
        revisionDate: new Date("2022-01-31T12:00:00.000Z"),
        collectionIds: undefined,
        localData: null,
        deletedDate: null,
        reprompt: 0,
        login: {
          passwordRevisionDate: new Date("2022-01-31T12:00:00.000Z"),
          autofillOnPageLoad: false,
          username: { encryptedString: "EncryptedString", encryptionType: 0 },
          password: { encryptedString: "EncryptedString", encryptionType: 0 },
          totp: { encryptedString: "EncryptedString", encryptionType: 0 },
          uris: [{ match: 0, uri: { encryptedString: "EncryptedString", encryptionType: 0 } }],
        },
        attachments: [
          {
            fileName: { encryptedString: "file", encryptionType: 0 },
            id: "a1",
            key: { encryptedString: "EncKey", encryptionType: 0 },
            size: "1100",
            sizeName: "1.1 KB",
            url: "url",
          },
          {
            fileName: { encryptedString: "file", encryptionType: 0 },
            id: "a2",
            key: { encryptedString: "EncKey", encryptionType: 0 },
            size: "1100",
            sizeName: "1.1 KB",
            url: "url",
          },
        ],
        fields: [
          {
            linkedId: null,
            name: { encryptedString: "EncryptedString", encryptionType: 0 },
            type: 0,
            value: { encryptedString: "EncryptedString", encryptionType: 0 },
          },
          {
            linkedId: null,
            name: { encryptedString: "EncryptedString", encryptionType: 0 },
            type: 1,
            value: { encryptedString: "EncryptedString", encryptionType: 0 },
          },
        ],
        passwordHistory: [
          {
            lastUsedDate: new Date("2022-01-31T12:00:00.000Z"),
            password: { encryptedString: "EncryptedString", encryptionType: 0 },
          },
        ],
      });
    });

    it("toCipherData", () => {
      const cipher = new Cipher(cipherData);
      expect(cipher.toCipherData("userId")).toEqual(cipherData);
    });

    it("Decrypt", async () => {
      const cipher = new Cipher();
      cipher.id = "id";
      cipher.organizationId = "orgId";
      cipher.folderId = "folderId";
      cipher.edit = true;
      cipher.viewPassword = true;
      cipher.organizationUseTotp = true;
      cipher.favorite = false;
      cipher.revisionDate = new Date("2022-01-31T12:00:00.000Z");
      cipher.type = CipherType.Login;
      cipher.name = mockEnc("EncryptedString");
      cipher.notes = mockEnc("EncryptedString");
      cipher.deletedDate = null;
      cipher.reprompt = CipherRepromptType.None;

      const loginView = new LoginView();
      loginView.username = "username";
      loginView.password = "password";

      const login = Substitute.for<Login>();
      login.decrypt(Arg.any(), Arg.any()).resolves(loginView);
      cipher.login = login;

      const cipherView = await cipher.decrypt();

      expect(cipherView).toMatchObject({
        id: "id",
        organizationId: "orgId",
        folderId: "folderId",
        name: "EncryptedString",
        notes: "EncryptedString",
        type: 1,
        favorite: false,
        organizationUseTotp: true,
        edit: true,
        viewPassword: true,
        login: loginView,
        attachments: null,
        fields: null,
        passwordHistory: null,
        collectionIds: undefined,
        revisionDate: new Date("2022-01-31T12:00:00.000Z"),
        deletedDate: null,
        reprompt: 0,
        localData: undefined,
      });
    });
  });

  describe("SecureNoteCipher", () => {
    let cipherData: CipherData;

    beforeEach(() => {
      cipherData = {
        id: "id",
        organizationId: "orgId",
        folderId: "folderId",
        userId: "userId",
        edit: true,
        viewPassword: true,
        organizationUseTotp: true,
        favorite: false,
        revisionDate: "2022-01-31T12:00:00.000Z",
        type: CipherType.SecureNote,
        name: "EncryptedString",
        notes: "EncryptedString",
        deletedDate: null,
        reprompt: CipherRepromptType.None,
        secureNote: {
          type: SecureNoteType.Generic,
        },
      };
    });

    it("Convert", () => {
      const cipher = new Cipher(cipherData);

      expect(cipher).toEqual({
        id: "id",
        userId: "userId",
        organizationId: "orgId",
        folderId: "folderId",
        name: { encryptedString: "EncryptedString", encryptionType: 0 },
        notes: { encryptedString: "EncryptedString", encryptionType: 0 },
        type: 2,
        favorite: false,
        organizationUseTotp: true,
        edit: true,
        viewPassword: true,
        revisionDate: new Date("2022-01-31T12:00:00.000Z"),
        collectionIds: undefined,
        localData: null,
        deletedDate: null,
        reprompt: 0,
        secureNote: { type: SecureNoteType.Generic },
        attachments: null,
        fields: null,
        passwordHistory: null,
      });
    });

    it("toCipherData", () => {
      const cipher = new Cipher(cipherData);
      expect(cipher.toCipherData("userId")).toEqual(cipherData);
    });

    it("Decrypt", async () => {
      const cipher = new Cipher();
      cipher.id = "id";
      cipher.organizationId = "orgId";
      cipher.folderId = "folderId";
      cipher.edit = true;
      cipher.viewPassword = true;
      cipher.organizationUseTotp = true;
      cipher.favorite = false;
      cipher.revisionDate = new Date("2022-01-31T12:00:00.000Z");
      cipher.type = CipherType.SecureNote;
      cipher.name = mockEnc("EncryptedString");
      cipher.notes = mockEnc("EncryptedString");
      cipher.deletedDate = null;
      cipher.reprompt = CipherRepromptType.None;
      cipher.secureNote = new SecureNote();
      cipher.secureNote.type = SecureNoteType.Generic;

      const cipherView = await cipher.decrypt();

      expect(cipherView).toMatchObject({
        id: "id",
        organizationId: "orgId",
        folderId: "folderId",
        name: "EncryptedString",
        notes: "EncryptedString",
        type: 2,
        favorite: false,
        organizationUseTotp: true,
        edit: true,
        viewPassword: true,
        secureNote: { type: 0 },
        attachments: null,
        fields: null,
        passwordHistory: null,
        collectionIds: undefined,
        revisionDate: new Date("2022-01-31T12:00:00.000Z"),
        deletedDate: null,
        reprompt: 0,
        localData: undefined,
      });
    });
  });

  describe("CardCipher", () => {
    let cipherData: CipherData;

    beforeEach(() => {
      cipherData = {
        id: "id",
        organizationId: "orgId",
        folderId: "folderId",
        userId: "userId",
        edit: true,
        viewPassword: true,
        organizationUseTotp: true,
        favorite: false,
        revisionDate: "2022-01-31T12:00:00.000Z",
        type: CipherType.Card,
        name: "EncryptedString",
        notes: "EncryptedString",
        deletedDate: null,
        reprompt: CipherRepromptType.None,
        card: {
          cardholderName: "EncryptedString",
          brand: "EncryptedString",
          number: "EncryptedString",
          expMonth: "EncryptedString",
          expYear: "EncryptedString",
          code: "EncryptedString",
        },
      };
    });

    it("Convert", () => {
      const cipher = new Cipher(cipherData);

      expect(cipher).toEqual({
        id: "id",
        userId: "userId",
        organizationId: "orgId",
        folderId: "folderId",
        name: { encryptedString: "EncryptedString", encryptionType: 0 },
        notes: { encryptedString: "EncryptedString", encryptionType: 0 },
        type: 3,
        favorite: false,
        organizationUseTotp: true,
        edit: true,
        viewPassword: true,
        revisionDate: new Date("2022-01-31T12:00:00.000Z"),
        collectionIds: undefined,
        localData: null,
        deletedDate: null,
        reprompt: 0,
        card: {
          cardholderName: { encryptedString: "EncryptedString", encryptionType: 0 },
          brand: { encryptedString: "EncryptedString", encryptionType: 0 },
          number: { encryptedString: "EncryptedString", encryptionType: 0 },
          expMonth: { encryptedString: "EncryptedString", encryptionType: 0 },
          expYear: { encryptedString: "EncryptedString", encryptionType: 0 },
          code: { encryptedString: "EncryptedString", encryptionType: 0 },
        },
        attachments: null,
        fields: null,
        passwordHistory: null,
      });
    });

    it("toCipherData", () => {
      const cipher = new Cipher(cipherData);
      expect(cipher.toCipherData("userId")).toEqual(cipherData);
    });

    it("Decrypt", async () => {
      const cipher = new Cipher();
      cipher.id = "id";
      cipher.organizationId = "orgId";
      cipher.folderId = "folderId";
      cipher.edit = true;
      cipher.viewPassword = true;
      cipher.organizationUseTotp = true;
      cipher.favorite = false;
      cipher.revisionDate = new Date("2022-01-31T12:00:00.000Z");
      cipher.type = CipherType.Card;
      cipher.name = mockEnc("EncryptedString");
      cipher.notes = mockEnc("EncryptedString");
      cipher.deletedDate = null;
      cipher.reprompt = CipherRepromptType.None;

      const cardView = new CardView();
      cardView.cardholderName = "cardholderName";
      cardView.number = "4111111111111111";

      const card = Substitute.for<Card>();
      card.decrypt(Arg.any(), Arg.any()).resolves(cardView);
      cipher.card = card;

      const cipherView = await cipher.decrypt();

      expect(cipherView).toMatchObject({
        id: "id",
        organizationId: "orgId",
        folderId: "folderId",
        name: "EncryptedString",
        notes: "EncryptedString",
        type: 3,
        favorite: false,
        organizationUseTotp: true,
        edit: true,
        viewPassword: true,
        card: cardView,
        attachments: null,
        fields: null,
        passwordHistory: null,
        collectionIds: undefined,
        revisionDate: new Date("2022-01-31T12:00:00.000Z"),
        deletedDate: null,
        reprompt: 0,
        localData: undefined,
      });
    });
  });

  describe("IdentityCipher", () => {
    let cipherData: CipherData;

    beforeEach(() => {
      cipherData = {
        id: "id",
        organizationId: "orgId",
        folderId: "folderId",
        userId: "userId",
        edit: true,
        viewPassword: true,
        organizationUseTotp: true,
        favorite: false,
        revisionDate: "2022-01-31T12:00:00.000Z",
        type: CipherType.Identity,
        name: "EncryptedString",
        notes: "EncryptedString",
        deletedDate: null,
        reprompt: CipherRepromptType.None,
        identity: {
          title: "EncryptedString",
          firstName: "EncryptedString",
          middleName: "EncryptedString",
          lastName: "EncryptedString",
          address1: "EncryptedString",
          address2: "EncryptedString",
          address3: "EncryptedString",
          city: "EncryptedString",
          state: "EncryptedString",
          postalCode: "EncryptedString",
          country: "EncryptedString",
          company: "EncryptedString",
          email: "EncryptedString",
          phone: "EncryptedString",
          ssn: "EncryptedString",
          username: "EncryptedString",
          passportNumber: "EncryptedString",
          licenseNumber: "EncryptedString",
        },
      };
    });

    it("Convert", () => {
      const cipher = new Cipher(cipherData);

      expect(cipher).toEqual({
        id: "id",
        userId: "userId",
        organizationId: "orgId",
        folderId: "folderId",
        name: { encryptedString: "EncryptedString", encryptionType: 0 },
        notes: { encryptedString: "EncryptedString", encryptionType: 0 },
        type: 4,
        favorite: false,
        organizationUseTotp: true,
        edit: true,
        viewPassword: true,
        revisionDate: new Date("2022-01-31T12:00:00.000Z"),
        collectionIds: undefined,
        localData: null,
        deletedDate: null,
        reprompt: 0,
        identity: {
          title: { encryptedString: "EncryptedString", encryptionType: 0 },
          firstName: { encryptedString: "EncryptedString", encryptionType: 0 },
          middleName: { encryptedString: "EncryptedString", encryptionType: 0 },
          lastName: { encryptedString: "EncryptedString", encryptionType: 0 },
          address1: { encryptedString: "EncryptedString", encryptionType: 0 },
          address2: { encryptedString: "EncryptedString", encryptionType: 0 },
          address3: { encryptedString: "EncryptedString", encryptionType: 0 },
          city: { encryptedString: "EncryptedString", encryptionType: 0 },
          state: { encryptedString: "EncryptedString", encryptionType: 0 },
          postalCode: { encryptedString: "EncryptedString", encryptionType: 0 },
          country: { encryptedString: "EncryptedString", encryptionType: 0 },
          company: { encryptedString: "EncryptedString", encryptionType: 0 },
          email: { encryptedString: "EncryptedString", encryptionType: 0 },
          phone: { encryptedString: "EncryptedString", encryptionType: 0 },
          ssn: { encryptedString: "EncryptedString", encryptionType: 0 },
          username: { encryptedString: "EncryptedString", encryptionType: 0 },
          passportNumber: { encryptedString: "EncryptedString", encryptionType: 0 },
          licenseNumber: { encryptedString: "EncryptedString", encryptionType: 0 },
        },
        attachments: null,
        fields: null,
        passwordHistory: null,
      });
    });

    it("toCipherData", () => {
      const cipher = new Cipher(cipherData);
      expect(cipher.toCipherData("userId")).toEqual(cipherData);
    });

    it("Decrypt", async () => {
      const cipher = new Cipher();
      cipher.id = "id";
      cipher.organizationId = "orgId";
      cipher.folderId = "folderId";
      cipher.edit = true;
      cipher.viewPassword = true;
      cipher.organizationUseTotp = true;
      cipher.favorite = false;
      cipher.revisionDate = new Date("2022-01-31T12:00:00.000Z");
      cipher.type = CipherType.Identity;
      cipher.name = mockEnc("EncryptedString");
      cipher.notes = mockEnc("EncryptedString");
      cipher.deletedDate = null;
      cipher.reprompt = CipherRepromptType.None;

      const identityView = new IdentityView();
      identityView.firstName = "firstName";
      identityView.lastName = "lastName";

      const identity = Substitute.for<Identity>();
      identity.decrypt(Arg.any(), Arg.any()).resolves(identityView);
      cipher.identity = identity;

      const cipherView = await cipher.decrypt();

      expect(cipherView).toMatchObject({
        id: "id",
        organizationId: "orgId",
        folderId: "folderId",
        name: "EncryptedString",
        notes: "EncryptedString",
        type: 4,
        favorite: false,
        organizationUseTotp: true,
        edit: true,
        viewPassword: true,
        identity: identityView,
        attachments: null,
        fields: null,
        passwordHistory: null,
        collectionIds: undefined,
        revisionDate: new Date("2022-01-31T12:00:00.000Z"),
        deletedDate: null,
        reprompt: 0,
        localData: undefined,
      });
    });
  });
});
