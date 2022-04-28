import { FirefoxCsvImporter as Importer } from "jslib-common/importers/firefoxCsvImporter";
import { CipherView } from "jslib-common/models/view/cipherView";
import { LoginUriView } from "jslib-common/models/view/loginUriView";
import { LoginView } from "jslib-common/models/view/loginView";

import { data as firefoxAccountsData } from "./testData/firefoxCsv/firefoxAccountsData.csv";
import { data as simplePasswordData } from "./testData/firefoxCsv/simplePasswordData.csv";

const CipherData = [
  {
    title: "should parse password",
    csv: simplePasswordData,
    expected: Object.assign(new CipherView(), {
      id: null,
      organizationId: null,
      folderId: null,
      name: "example.com",
      login: Object.assign(new LoginView(), {
        username: "foo",
        password: "bar",
        uris: [
          Object.assign(new LoginUriView(), {
            uri: "https://example.com",
          }),
        ],
      }),
      notes: null,
      type: 1,
    }),
  },
  {
    title: 'should skip "chrome://FirefoxAccounts"',
    csv: firefoxAccountsData,
    expected: Object.assign(new CipherView(), {
      id: null,
      organizationId: null,
      folderId: null,
      name: "example.com",
      login: Object.assign(new LoginView(), {
        username: "foo",
        password: "bar",
        uris: [
          Object.assign(new LoginUriView(), {
            uri: "https://example.com",
          }),
        ],
      }),
      notes: null,
      type: 1,
    }),
  },
];

describe("Firefox CSV Importer", () => {
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
