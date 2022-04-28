import { CipherType } from "jslib-common/enums/cipherType";
import { OnePasswordMacCsvImporter as Importer } from "jslib-common/importers/onepasswordImporters/onepasswordMacCsvImporter";
import { CipherView } from "jslib-common/models/view/cipherView";

import { data as creditCardData } from "./testData/onePasswordCsv/creditCard.mac.csv";
import { data as identityData } from "./testData/onePasswordCsv/identity.mac.csv";
import { data as multiTypeData } from "./testData/onePasswordCsv/multipleItems.mac.csv";

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

  expect(cipher.notes).toContain("address\ncity state zip\nUnited States");
}

function expectCreditCard(cipher: CipherView) {
  expect(cipher.type).toBe(CipherType.Card);

  expect(cipher.card).toEqual(
    expect.objectContaining({
      number: "4111111111111111",
      code: "111",
      cardholderName: "test",
      expMonth: "1",
      expYear: "2030",
    })
  );
}

describe("1Password mac CSV Importer", () => {
  it("should parse identity records", async () => {
    const importer = new Importer();
    const result = await importer.parse(identityData);

    expect(result).not.toBeNull();
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(1);
    const cipher = result.ciphers[0];
    expectIdentity(cipher);
  });

  it("should parse credit card records", async () => {
    const importer = new Importer();
    const result = await importer.parse(creditCardData);

    expect(result).not.toBeNull();
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(1);
    const cipher = result.ciphers[0];
    expectCreditCard(cipher);
  });

  it("should parse csv's with multiple record type", async () => {
    const importer = new Importer();
    const result = await importer.parse(multiTypeData);

    expect(result).not.toBeNull();
    expect(result.success).toBe(true);
    expect(result.ciphers.length).toBe(4);
    expectIdentity(result.ciphers[1]);
    expectCreditCard(result.ciphers[2]);
  });
});
