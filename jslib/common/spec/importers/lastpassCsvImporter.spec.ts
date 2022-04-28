import { CipherType } from "jslib-common/enums/cipherType";
import { FieldType } from "jslib-common/enums/fieldType";
import { LastPassCsvImporter as Importer } from "jslib-common/importers/lastpassCsvImporter";
import { ImportResult } from "jslib-common/models/domain/importResult";
import { CipherView } from "jslib-common/models/view/cipherView";
import { FieldView } from "jslib-common/models/view/fieldView";

function baseExcept(result: ImportResult) {
  expect(result).not.toBeNull();
  expect(result.success).toBe(true);
  expect(result.ciphers.length).toBe(1);
}

function expectLogin(cipher: CipherView) {
  expect(cipher.type).toBe(CipherType.Login);

  expect(cipher.name).toBe("example.com");
  expect(cipher.notes).toBe("super secure notes");
  expect(cipher.login.uri).toBe("http://example.com");
  expect(cipher.login.username).toBe("someUser");
  expect(cipher.login.password).toBe("myPassword");
  expect(cipher.login.totp).toBe("Y64VEVMBTSXCYIWRSHRNDZW62MPGVU2G");
}

const CipherData = [
  {
    title: "should parse expiration date",
    csv: `url,username,password,extra,name,grouping,fav
http://sn,,,"NoteType:Credit Card
Name on Card:John Doe
Type:
Number:1234567812345678
Security Code:123
Start Date:October,2017
Expiration Date:June,2020
Notes:some text
",Credit-card,,0`,
    expected: Object.assign(new CipherView(), {
      id: null,
      organizationId: null,
      folderId: null,
      name: "Credit-card",
      notes: "some text\n",
      type: 3,
      card: {
        cardholderName: "John Doe",
        number: "1234567812345678",
        code: "123",
        expYear: "2020",
        expMonth: "6",
      },
      fields: [
        Object.assign(new FieldView(), {
          name: "Start Date",
          value: "October,2017",
          type: FieldType.Text,
        }),
      ],
    }),
  },
  {
    title: "should parse blank card note",
    csv: `url,username,password,extra,name,grouping,fav
http://sn,,,"NoteType:Credit Card
Name on Card:
Type:
Number:
Security Code:
Start Date:,
Expiration Date:,
Notes:",empty,,0`,
    expected: Object.assign(new CipherView(), {
      id: null,
      organizationId: null,
      folderId: null,
      name: "empty",
      notes: null,
      type: 3,
      card: {
        expMonth: undefined,
      },
      fields: [
        Object.assign(new FieldView(), {
          name: "Start Date",
          value: ",",
          type: FieldType.Text,
        }),
      ],
    }),
  },
  {
    title: "should parse card expiration date w/ no exp year",
    csv: `url,username,password,extra,name,grouping,fav
http://sn,,,"NoteType:Credit Card
Name on Card:John Doe
Type:Visa
Number:1234567887654321
Security Code:321
Start Date:,
Expiration Date:January,
Notes:",noyear,,0`,
    expected: Object.assign(new CipherView(), {
      id: null,
      organizationId: null,
      folderId: null,
      name: "noyear",
      notes: null,
      type: 3,
      card: {
        cardholderName: "John Doe",
        number: "1234567887654321",
        code: "321",
        expMonth: "1",
      },
      fields: [
        Object.assign(new FieldView(), {
          name: "Type",
          value: "Visa",
          type: FieldType.Text,
        }),
        Object.assign(new FieldView(), {
          name: "Start Date",
          value: ",",
          type: FieldType.Text,
        }),
      ],
    }),
  },
  {
    title: "should parse card expiration date w/ no month",
    csv: `url,username,password,extra,name,grouping,fav
http://sn,,,"NoteType:Credit Card
Name on Card:John Doe
Type:Mastercard
Number:8765432112345678
Security Code:987
Start Date:,
Expiration Date:,2020
Notes:",nomonth,,0`,
    expected: Object.assign(new CipherView(), {
      id: null,
      organizationId: null,
      folderId: null,
      name: "nomonth",
      notes: null,
      type: 3,
      card: {
        cardholderName: "John Doe",
        number: "8765432112345678",
        code: "987",
        expYear: "2020",
        expMonth: undefined,
      },
      fields: [
        Object.assign(new FieldView(), {
          name: "Type",
          value: "Mastercard",
          type: FieldType.Text,
        }),
        Object.assign(new FieldView(), {
          name: "Start Date",
          value: ",",
          type: FieldType.Text,
        }),
      ],
    }),
  },
];

describe("Lastpass CSV Importer", () => {
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

  it("should parse login with totp", async () => {
    const input = `url,username,password,totp,extra,name,grouping,fav
        http://example.com,someUser,myPassword,Y64VEVMBTSXCYIWRSHRNDZW62MPGVU2G,super secure notes,example.com,,0`;

    const importer = new Importer();
    const result = await importer.parse(input);
    baseExcept(result);

    const cipher = result.ciphers[0];
    expectLogin(cipher);
  });
});
