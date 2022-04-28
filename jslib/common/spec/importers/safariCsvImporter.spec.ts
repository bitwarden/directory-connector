import { SafariCsvImporter as Importer } from "jslib-common/importers/safariCsvImporter";
import { CipherView } from "jslib-common/models/view/cipherView";
import { LoginUriView } from "jslib-common/models/view/loginUriView";
import { LoginView } from "jslib-common/models/view/loginView";

import { data as oldSimplePasswordData } from "./testData/safariCsv/oldSimplePasswordData.csv";
import { data as simplePasswordData } from "./testData/safariCsv/simplePasswordData.csv";

const CipherData = [
  {
    title: "should parse URLs in new CSV format",
    csv: simplePasswordData,
    expected: Object.assign(new CipherView(), {
      id: null,
      organizationId: null,
      folderId: null,
      name: "example.com (example_user)",
      login: Object.assign(new LoginView(), {
        username: "example_user",
        password: "example_p@ssword",
        uris: [
          Object.assign(new LoginUriView(), {
            uri: "https://example.com",
          }),
        ],
        totp: "otpauth://totp/test?secret=examplesecret",
      }),
      notes: "Example note\nMore notes on new line",
      type: 1,
    }),
  },
  {
    title: "should parse URLs in old CSV format",
    csv: oldSimplePasswordData,
    expected: Object.assign(new CipherView(), {
      id: null,
      organizationId: null,
      folderId: null,
      name: "example.com (example_user)",
      login: Object.assign(new LoginView(), {
        username: "example_user",
        password: "example_p@ssword",
        uris: [
          Object.assign(new LoginUriView(), {
            uri: "https://example.com",
          }),
        ],
      }),
      type: 1,
    }),
  },
];

describe("Safari CSV Importer", () => {
  CipherData.forEach((data) => {
    it(data.title, async () => {
      const importer = new Importer();
      const result = await importer.parse(data.csv);
      expect(result != null).toBe(true);
      expect(result.ciphers.length).toBeGreaterThan(0);

      const cipher = result.ciphers.shift();
      let property: keyof typeof data.expected;
      for (property in data.expected) {
        // eslint-disable-next-line
        if (data.expected.hasOwnProperty(property)) {
          // eslint-disable-next-line
          expect(cipher.hasOwnProperty(property)).toBe(true);
          expect(cipher[property]).toEqual(data.expected[property]);
        }
      }
    });
  });
});
