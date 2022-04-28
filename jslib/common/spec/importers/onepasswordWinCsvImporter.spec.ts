import { CipherType } from "jslib-common/enums/cipherType";
import { FieldType } from "jslib-common/enums/fieldType";
import { OnePasswordWinCsvImporter as Importer } from "jslib-common/importers/onepasswordImporters/onepasswordWinCsvImporter";
import { CipherView } from "jslib-common/models/view/cipherView";
import { FieldView } from "jslib-common/models/view/fieldView";

import { data as creditCardData } from "./testData/onePasswordCsv/creditCard.windows.csv";
import { data as identityData } from "./testData/onePasswordCsv/identity.windows.csv";
import { data as multiTypeData } from "./testData/onePasswordCsv/multipleItems.windows.csv";

function expectIdentity(cipher: CipherView) {
  expect(cipher.type).toBe(CipherType.Identity);

  expect(cipher.identity).toEqual(
    expect.objectContaining({
      firstName: "first name",
      middleName: "mi",
      lastName: "last name",
      username: "userNam3",
      company: "bitwarden",
      phone: "8005555555",
      email: "email@bitwarden.com",
    })
  );

  expect(cipher.fields).toEqual(
    expect.arrayContaining([
      Object.assign(new FieldView(), {
        type: FieldType.Text,
        name: "address",
        value: "address city state zip us",
      }),
    ])
  );
}

function expectCreditCard(cipher: CipherView) {
  expect(cipher.type).toBe(CipherType.Card);

  expect(cipher.card).toEqual(
    expect.objectContaining({
      number: "4111111111111111",
      code: "111",
      cardholderName: "test",
      expMonth: "1",
      expYear: "1970",
    })
  );
}

describe("1Password windows CSV Importer", () => {
  let importer: Importer;
  beforeEach(() => {
    importer = new Importer();
  });

  it("should parse identity records", async () => {
    const result = await importer.parse(identityData);

    expect(result).not.toBeNull();
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(1);
    const cipher = result.ciphers[0];
    expectIdentity(cipher);
  });

  it("should parse credit card records", async () => {
    const result = await importer.parse(creditCardData);

    expect(result).not.toBeNull();
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(1);
    const cipher = result.ciphers[0];
    expectCreditCard(cipher);
  });

  it("should parse csv's with multiple record types", async () => {
    const result = await importer.parse(multiTypeData);

    expect(result).not.toBeNull();
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(4);

    expectIdentity(result.ciphers[1]);
    expectCreditCard(result.ciphers[2]);
  });
});
