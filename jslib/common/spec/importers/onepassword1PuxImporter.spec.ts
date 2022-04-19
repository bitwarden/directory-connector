import { CipherType } from "jslib-common/enums/cipherType";
import { FieldType } from "jslib-common/enums/fieldType";
import { SecureNoteType } from "jslib-common/enums/secureNoteType";
import { OnePassword1PuxImporter as Importer } from "jslib-common/importers/onepasswordImporters/onepassword1PuxImporter";
import { Utils } from "jslib-common/misc/utils";
import { FieldView } from "jslib-common/models/view/fieldView";

import { APICredentialsData } from "./testData/onePassword1Pux/APICredentials";
import { BankAccountData } from "./testData/onePassword1Pux/BankAccount";
import { CreditCardData } from "./testData/onePassword1Pux/CreditCard";
import { DatabaseData } from "./testData/onePassword1Pux/Database";
import { DriversLicenseData } from "./testData/onePassword1Pux/DriversLicense";
import { EmailAccountData } from "./testData/onePassword1Pux/EmailAccount";
import { EmailFieldData } from "./testData/onePassword1Pux/Emailfield";
import { EmailFieldOnIdentityData } from "./testData/onePassword1Pux/EmailfieldOnIdentity";
import { EmailFieldOnIdentityPrefilledData } from "./testData/onePassword1Pux/EmailfieldOnIdentity_Prefilled";
import { IdentityData } from "./testData/onePassword1Pux/IdentityData";
import { LoginData } from "./testData/onePassword1Pux/LoginData";
import { MedicalRecordData } from "./testData/onePassword1Pux/MedicalRecord";
import { MembershipData } from "./testData/onePassword1Pux/Membership";
import { OnePuxExampleFile } from "./testData/onePassword1Pux/Onepux_example";
import { OutdoorLicenseData } from "./testData/onePassword1Pux/OutdoorLicense";
import { PassportData } from "./testData/onePassword1Pux/Passport";
import { PasswordData } from "./testData/onePassword1Pux/Password";
import { RewardsProgramData } from "./testData/onePassword1Pux/RewardsProgram";
import { SSNData } from "./testData/onePassword1Pux/SSN";
import { SanitizedExport } from "./testData/onePassword1Pux/SanitizedExport";
import { SecureNoteData } from "./testData/onePassword1Pux/SecureNote";
import { ServerData } from "./testData/onePassword1Pux/Server";
import { SoftwareLicenseData } from "./testData/onePassword1Pux/SoftwareLicense";
import { WirelessRouterData } from "./testData/onePassword1Pux/WirelessRouter";

function validateCustomField(fields: FieldView[], fieldName: string, expectedValue: any) {
  expect(fields).toBeDefined();
  const customField = fields.find((f) => f.name === fieldName);
  expect(customField).toBeDefined();

  expect(customField.value).toEqual(expectedValue);
}

describe("1Password 1Pux Importer", () => {
  const OnePuxExampleFileJson = JSON.stringify(OnePuxExampleFile);
  const LoginDataJson = JSON.stringify(LoginData);
  const CreditCardDataJson = JSON.stringify(CreditCardData);
  const IdentityDataJson = JSON.stringify(IdentityData);
  const SecureNoteDataJson = JSON.stringify(SecureNoteData);
  const SanitizedExportJson = JSON.stringify(SanitizedExport);

  it("should parse login data", async () => {
    const importer = new Importer();
    const result = await importer.parse(LoginDataJson);
    expect(result != null).toBe(true);

    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.Login);
    expect(cipher.name).toEqual("eToro");

    expect(cipher.login.username).toEqual("username123123123@gmail.com");
    expect(cipher.login.password).toEqual("password!");
    expect(cipher.login.uris.length).toEqual(1);
    expect(cipher.login.uri).toEqual("https://www.fakesite.com");
    expect(cipher.login.totp).toEqual("otpseed777");

    // remaining fields as custom fields
    expect(cipher.fields.length).toEqual(3);
    validateCustomField(cipher.fields, "terms", "false");
    validateCustomField(cipher.fields, "policies", "true");
    validateCustomField(cipher.fields, "cyqyggt2otns6tbbqtsl6w2ceu", "username123123");
  });

  it("should parse notes", async () => {
    const importer = new Importer();
    const result = await importer.parse(OnePuxExampleFileJson);
    expect(result != null).toBe(true);

    const cipher = result.ciphers.shift();
    expect(cipher.notes).toEqual("This is a note. *bold*! _italic_!");
  });

  it("should set favourite if favIndex equals 1", async () => {
    const importer = new Importer();
    const result = await importer.parse(OnePuxExampleFileJson);
    expect(result != null).toBe(true);

    const cipher = result.ciphers.shift();
    expect(cipher.favorite).toBe(true);
  });

  it("should handle custom boolean fields", async () => {
    const importer = new Importer();
    const result = await importer.parse(LoginDataJson);
    expect(result != null).toBe(true);

    const ciphers = result.ciphers;
    expect(ciphers.length).toEqual(1);

    const cipher = ciphers.shift();
    expect(cipher.fields[0].name).toEqual("terms");
    expect(cipher.fields[0].value).toEqual("false");
    expect(cipher.fields[0].type).toBe(FieldType.Boolean);

    expect(cipher.fields[1].name).toEqual("policies");
    expect(cipher.fields[1].value).toEqual("true");
    expect(cipher.fields[1].type).toBe(FieldType.Boolean);
  });

  it("should add fields of type email as custom fields", async () => {
    const importer = new Importer();
    const EmailFieldDataJson = JSON.stringify(EmailFieldData);
    const result = await importer.parse(EmailFieldDataJson);
    expect(result != null).toBe(true);

    const ciphers = result.ciphers;
    expect(ciphers.length).toEqual(1);
    const cipher = ciphers.shift();

    expect(cipher.fields[0].name).toEqual("reg_email");
    expect(cipher.fields[0].value).toEqual("kriddler@nullvalue.test");
    expect(cipher.fields[0].type).toBe(FieldType.Text);

    expect(cipher.fields[1].name).toEqual("provider");
    expect(cipher.fields[1].value).toEqual("myEmailProvider");
    expect(cipher.fields[1].type).toBe(FieldType.Text);
  });

  it('should create concealed field as "hidden" type', async () => {
    const importer = new Importer();
    const result = await importer.parse(OnePuxExampleFileJson);
    expect(result != null).toBe(true);

    const ciphers = result.ciphers;
    expect(ciphers.length).toEqual(1);

    const cipher = ciphers.shift();
    const fields = cipher.fields;
    expect(fields.length).toEqual(1);

    const field = fields.shift();
    expect(field.name).toEqual("PIN");
    expect(field.value).toEqual("12345");
    expect(field.type).toEqual(FieldType.Hidden);
  });

  it("should create password history", async () => {
    const importer = new Importer();
    const result = await importer.parse(OnePuxExampleFileJson);
    const cipher = result.ciphers.shift();

    expect(cipher.passwordHistory.length).toEqual(1);
    const ph = cipher.passwordHistory.shift();
    expect(ph.password).toEqual("12345password");
    expect(ph.lastUsedDate.toISOString()).toEqual("2016-03-18T17:32:35.000Z");
  });

  it("should create credit card records", async () => {
    const importer = new Importer();
    const result = await importer.parse(CreditCardDataJson);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();
    expect(cipher.name).toEqual("Parent's Credit Card");
    expect(cipher.notes).toEqual("My parents' credit card.");

    const card = cipher.card;
    expect(card.cardholderName).toEqual("Fred Engels");
    expect(card.number).toEqual("6011111111111117");
    expect(card.code).toEqual("1312");
    expect(card.brand).toEqual("Discover");
    expect(card.expMonth).toEqual("12");
    expect(card.expYear).toEqual("2099");

    // remaining fields as custom fields
    expect(cipher.fields.length).toEqual(12);
    validateCustomField(cipher.fields, "txbzvwzpck7ejhfres3733rbpm", "card");
    validateCustomField(cipher.fields, "cashLimit", "$500");
    validateCustomField(cipher.fields, "creditLimit", "$1312");
    validateCustomField(cipher.fields, "validFrom", "200101");
    validateCustomField(cipher.fields, "bank", "Some bank");
    validateCustomField(cipher.fields, "phoneLocal", "123456");
    validateCustomField(cipher.fields, "phoneTollFree", "0800123456");
    validateCustomField(cipher.fields, "phoneIntl", "+49123456");
    validateCustomField(cipher.fields, "website", "somebank.com");
    validateCustomField(cipher.fields, "pin", "1234");
    validateCustomField(cipher.fields, "interest", "1%");
    validateCustomField(cipher.fields, "issuenumber", "123456");
  });

  it("should create identity records", async () => {
    const importer = new Importer();
    const result = await importer.parse(IdentityDataJson);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();
    expect(cipher.name).toEqual("George Engels");

    const identity = cipher.identity;
    expect(identity.firstName).toEqual("George");
    expect(identity.middleName).toEqual("S");
    expect(identity.lastName).toEqual("Engels");
    expect(identity.company).toEqual("Acme Inc.");
    expect(identity.address1).toEqual("1312 Main St.");
    expect(identity.country).toEqual("US");
    expect(identity.state).toEqual("California");
    expect(identity.city).toEqual("Atlantis");
    expect(identity.postalCode).toEqual("90210");
    expect(identity.phone).toEqual("4565555555");
    expect(identity.email).toEqual("gengels@nullvalue.test");
    expect(identity.username).toEqual("gengels");

    // remaining fields as custom fields
    expect(cipher.fields.length).toEqual(17);
    validateCustomField(cipher.fields, "sex", "male");
    validateCustomField(cipher.fields, "birthdate", "Thu, 01 Jan 1981 12:01:00 GMT");
    validateCustomField(cipher.fields, "occupation", "Steel Worker");
    validateCustomField(cipher.fields, "department", "QA");
    validateCustomField(cipher.fields, "jobtitle", "Quality Assurance Manager");
    validateCustomField(cipher.fields, "homephone", "4575555555");
    validateCustomField(cipher.fields, "cellphone", "4585555555");
    validateCustomField(cipher.fields, "busphone", "4595555555");
    validateCustomField(cipher.fields, "reminderq", "Who's a super cool guy?");
    validateCustomField(cipher.fields, "remindera", "Me, buddy.");
    validateCustomField(cipher.fields, "website", "cv.gengels.nullvalue.test");
    validateCustomField(cipher.fields, "icq", "12345678");
    validateCustomField(cipher.fields, "skype", "skypeisbad1619");
    validateCustomField(cipher.fields, "aim", "aollol@lololol.aol.com");
    validateCustomField(cipher.fields, "yahoo", "sk8rboi13@yah00.com");
    validateCustomField(cipher.fields, "msn", "msnothankyou@msn&m&m.com");
    validateCustomField(cipher.fields, "forumsig", "super cool guy");
  });

  it("emails fields on identity types should be added to the identity email field", async () => {
    const importer = new Importer();
    const EmailFieldOnIdentityDataJson = JSON.stringify(EmailFieldOnIdentityData);
    const result = await importer.parse(EmailFieldOnIdentityDataJson);
    expect(result != null).toBe(true);

    const ciphers = result.ciphers;
    expect(ciphers.length).toEqual(1);
    const cipher = ciphers.shift();

    const identity = cipher.identity;
    expect(identity.email).toEqual("gengels@nullvalue.test");

    expect(cipher.fields[0].name).toEqual("provider");
    expect(cipher.fields[0].value).toEqual("myEmailProvider");
    expect(cipher.fields[0].type).toBe(FieldType.Text);
  });

  it("emails fields on identity types should be added to custom fields if identity.email has been filled", async () => {
    const importer = new Importer();
    const EmailFieldOnIdentityPrefilledDataJson = JSON.stringify(EmailFieldOnIdentityPrefilledData);
    const result = await importer.parse(EmailFieldOnIdentityPrefilledDataJson);
    expect(result != null).toBe(true);

    const ciphers = result.ciphers;
    expect(ciphers.length).toEqual(1);
    const cipher = ciphers.shift();

    const identity = cipher.identity;
    expect(identity.email).toEqual("gengels@nullvalue.test");

    expect(cipher.fields[0].name).toEqual("2nd_email");
    expect(cipher.fields[0].value).toEqual("kriddler@nullvalue.test");
    expect(cipher.fields[0].type).toBe(FieldType.Text);

    expect(cipher.fields[1].name).toEqual("provider");
    expect(cipher.fields[1].value).toEqual("myEmailProvider");
    expect(cipher.fields[1].type).toBe(FieldType.Text);
  });

  it("should parse category 005 - Password (Legacy)", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(PasswordData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();
    expect(cipher.type).toEqual(CipherType.Login);
    expect(cipher.name).toEqual("SuperSecret Password");
    expect(cipher.notes).toEqual("SuperSecret Password Notes");

    expect(cipher.login.password).toEqual("GBq[AGb]4*Si3tjwuab^");
    expect(cipher.login.uri).toEqual("https://n0t.y0ur.n0rm4l.w3bs1t3");
  });

  it("should parse category 100 - SoftwareLicense", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(SoftwareLicenseData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();
    expect(cipher.type).toEqual(CipherType.SecureNote);
    expect(cipher.name).toEqual("Limux Product Key");
    expect(cipher.notes).toEqual("My Software License");

    expect(cipher.fields.length).toEqual(13);
    validateCustomField(cipher.fields, "product_version", "5.10.1000");
    validateCustomField(cipher.fields, "reg_code", "265453-13457355-847327");
    validateCustomField(cipher.fields, "reg_name", "Kay Riddler");
    validateCustomField(cipher.fields, "reg_email", "kriddler@nullvalue.test");
    validateCustomField(cipher.fields, "company", "Riddles and Jigsaw Puzzles GmbH");
    validateCustomField(
      cipher.fields,
      "download_link",
      "https://limuxcompany.nullvalue.test/5.10.1000/isos"
    );
    validateCustomField(cipher.fields, "publisher_name", "Limux Software and Hardware");
    validateCustomField(cipher.fields, "publisher_website", "https://limuxcompany.nullvalue.test/");
    validateCustomField(cipher.fields, "retail_price", "$999");
    validateCustomField(cipher.fields, "support_email", "support@nullvalue.test");
    validateCustomField(cipher.fields, "order_date", "Thu, 01 Apr 2021 12:01:00 GMT");
    validateCustomField(cipher.fields, "order_number", "594839");
    validateCustomField(cipher.fields, "order_total", "$1086.59");
  });

  it("should parse category 101 - BankAccount", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(BankAccountData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();
    expect(cipher.type).toEqual(CipherType.Card);
    expect(cipher.name).toEqual("Bank Account");
    expect(cipher.notes).toEqual("My Bank Account");

    expect(cipher.card.cardholderName).toEqual("Cool Guy");

    expect(cipher.fields.length).toEqual(9);
    validateCustomField(cipher.fields, "bankName", "Super Credit Union");
    validateCustomField(cipher.fields, "accountType", "checking");
    validateCustomField(cipher.fields, "routingNo", "111000999");
    validateCustomField(cipher.fields, "accountNo", "192837465918273645");
    validateCustomField(cipher.fields, "swift", "123456");
    validateCustomField(cipher.fields, "iban", "DE12 123456");
    validateCustomField(cipher.fields, "telephonePin", "5555");
    validateCustomField(cipher.fields, "branchPhone", "9399399933");
    validateCustomField(cipher.fields, "branchAddress", "1 Fifth Avenue");
  });

  it("should parse category 102 - Database", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(DatabaseData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.Login);
    expect(cipher.name).toEqual("Database");
    expect(cipher.notes).toEqual("My Database");

    const login = cipher.login;
    expect(login.username).toEqual("cooldbuser");
    expect(login.password).toEqual("^+kTjhLaN7wVPAhGU)*J");

    expect(cipher.fields.length).toEqual(7);
    validateCustomField(cipher.fields, "database_type", "postgresql");
    validateCustomField(cipher.fields, "hostname", "my.secret.db.server");
    validateCustomField(cipher.fields, "port", "1337");
    validateCustomField(cipher.fields, "database", "user_database");
    validateCustomField(cipher.fields, "sid", "ASDIUFU-283234");
    validateCustomField(cipher.fields, "alias", "cdbu");
    validateCustomField(cipher.fields, "options", "ssh");
  });

  it("should parse category 103 - Drivers license", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(DriversLicenseData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();
    expect(cipher.name).toEqual("Michael Scarn");
    expect(cipher.subTitle).toEqual("Michael Scarn");
    expect(cipher.notes).toEqual("My Driver's License");

    const identity = cipher.identity;
    expect(identity.firstName).toEqual("Michael");
    expect(identity.middleName).toBeNull();
    expect(identity.lastName).toEqual("Scarn");
    expect(identity.address1).toEqual("2120 Mifflin Rd.");
    expect(identity.state).toEqual("Pennsylvania");
    expect(identity.country).toEqual("United States");
    expect(identity.licenseNumber).toEqual("12345678901");

    expect(cipher.fields.length).toEqual(6);
    validateCustomField(cipher.fields, "birthdate", "Sun, 01 Jan 1978 12:01:00 GMT");
    validateCustomField(cipher.fields, "sex", "male");
    validateCustomField(cipher.fields, "height", "5'11\"");
    validateCustomField(cipher.fields, "class", "C");
    validateCustomField(cipher.fields, "conditions", "B");
    validateCustomField(cipher.fields, "expiry_date", "203012");
  });

  it("should parse category 104 - Outdoor License", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(OutdoorLicenseData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.Identity);
    expect(cipher.name).toEqual("Harvest License");
    expect(cipher.subTitle).toEqual("Cash Bandit");
    expect(cipher.notes).toEqual("My Outdoor License");

    const identity = cipher.identity;
    expect(identity.firstName).toEqual("Cash");
    expect(identity.middleName).toBeNull();
    expect(identity.lastName).toEqual("Bandit");
    expect(identity.state).toEqual("Washington");
    expect(identity.country).toEqual("United States of America");

    expect(cipher.fields.length).toEqual(4);
    validateCustomField(cipher.fields, "valid_from", "Thu, 01 Apr 2021 12:01:00 GMT");
    validateCustomField(cipher.fields, "expires", "Fri, 01 Apr 2044 12:01:00 GMT");
    validateCustomField(cipher.fields, "game", "Bananas,blueberries,corn");
    validateCustomField(cipher.fields, "quota", "100/each");
  });

  it("should parse category 105 - Membership", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(MembershipData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.Identity);
    expect(cipher.name).toEqual("Library Card");

    const identity = cipher.identity;
    expect(identity.firstName).toEqual("George");
    expect(identity.middleName).toBeNull();
    expect(identity.lastName).toEqual("Engels");
    expect(identity.company).toEqual("National Public Library");
    expect(identity.phone).toEqual("9995555555");

    expect(cipher.fields.length).toEqual(5);
    validateCustomField(cipher.fields, "website", "https://npl.nullvalue.gov.test");
    validateCustomField(cipher.fields, "member_since", "199901");
    validateCustomField(cipher.fields, "expiry_date", "203412");
    validateCustomField(cipher.fields, "membership_no", "64783862");
    validateCustomField(cipher.fields, "pin", "19191");
  });

  it("should parse category 106 - Passport", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(PassportData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.Identity);
    expect(cipher.name).toEqual("Mr. Globewide");

    const identity = cipher.identity;
    expect(identity.firstName).toEqual("David");
    expect(identity.middleName).toBeNull();
    expect(identity.lastName).toEqual("Global");
    expect(identity.passportNumber).toEqual("76436847");

    expect(cipher.fields.length).toEqual(8);
    validateCustomField(cipher.fields, "type", "US Passport");
    validateCustomField(cipher.fields, "sex", "female");
    validateCustomField(cipher.fields, "nationality", "International");
    validateCustomField(cipher.fields, "issuing_authority", "Department of State");
    validateCustomField(cipher.fields, "birthdate", "Fri, 01 Apr 1983 12:01:00 GMT");
    validateCustomField(cipher.fields, "birthplace", "A cave somewhere in Maine");
    validateCustomField(cipher.fields, "issue_date", "Wed, 01 Jan 2020 12:01:00 GMT");
    validateCustomField(cipher.fields, "expiry_date", "Sat, 01 Jan 2050 12:01:00 GMT");
  });

  it("should parse category 107 - RewardsProgram", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(RewardsProgramData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.Identity);
    expect(cipher.name).toEqual("Retail Reward Thing");

    const identity = cipher.identity;
    expect(identity.firstName).toEqual("Chef");
    expect(identity.middleName).toBeNull();
    expect(identity.lastName).toEqual("Coldroom");
    expect(identity.company).toEqual("Super Cool Store Co.");

    expect(cipher.fields.length).toEqual(7);
    validateCustomField(cipher.fields, "membership_no", "member-29813569");
    validateCustomField(cipher.fields, "pin", "99913");
    validateCustomField(cipher.fields, "additional_no", "additional member id");
    validateCustomField(cipher.fields, "member_since", "202101");
    validateCustomField(cipher.fields, "customer_service_phone", "123456");
    validateCustomField(cipher.fields, "reservations_phone", "123456");
    validateCustomField(cipher.fields, "website", "supercoolstore.com");
  });

  it("should parse category 108 - SSN", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(SSNData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();
    expect(cipher.name).toEqual("SSN");

    const identity = cipher.identity;
    expect(identity.firstName).toEqual("Jack");
    expect(identity.middleName).toBeNull();
    expect(identity.lastName).toEqual("Judd");
    expect(identity.ssn).toEqual("131-216-1900");
  });

  it("should parse category 109 - WirelessRouter", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(WirelessRouterData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.Login);
    expect(cipher.name).toEqual("Wireless Router");
    expect(cipher.notes).toEqual("My Wifi Router Config");

    expect(cipher.login.password).toEqual("BqatGTVQ9TCN72tLbjrsHqkb");

    expect(cipher.fields.length).toEqual(7);
    validateCustomField(cipher.fields, "name", "pixel 2Xl");
    validateCustomField(cipher.fields, "server", "127.0.0.1");
    validateCustomField(cipher.fields, "airport_id", "some airportId");
    validateCustomField(cipher.fields, "network_name", "some network name");
    validateCustomField(cipher.fields, "wireless_security", "WPA");
    validateCustomField(cipher.fields, "wireless_password", "wifipassword");
    validateCustomField(cipher.fields, "disk_password", "diskpassword");
  });

  it("should parse category 110 - Server", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(ServerData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.Login);
    expect(cipher.name).toEqual("Super Cool Server");
    expect(cipher.notes).toEqual("My Server");

    expect(cipher.login.username).toEqual("frankly-notsure");
    expect(cipher.login.password).toEqual("*&YHJI87yjy78u");
    expect(cipher.login.uri).toEqual("https://coolserver.nullvalue.test");

    expect(cipher.fields.length).toEqual(7);
    validateCustomField(
      cipher.fields,
      "admin_console_url",
      "https://coolserver.nullvalue.test/admin"
    );
    validateCustomField(cipher.fields, "admin_console_username", "frankly-idontknowwhatimdoing");
    validateCustomField(cipher.fields, "admin_console_password", "^%RY&^YUiju8iUYHJI(U");
    validateCustomField(cipher.fields, "name", "Private Hosting Provider Inc.");
    validateCustomField(cipher.fields, "website", "https://phpi.nullvalue.test");
    validateCustomField(
      cipher.fields,
      "support_contact_url",
      "https://phpi.nullvalue.test/support"
    );
    validateCustomField(cipher.fields, "support_contact_phone", "8882569382");
  });

  it("should parse category 111 - EmailAccount", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(EmailAccountData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.SecureNote);
    expect(cipher.name).toEqual("Email Config");
    expect(cipher.notes).toEqual("My Email Config");

    expect(cipher.fields.length).toEqual(17);
    validateCustomField(cipher.fields, "pop_type", "either");
    validateCustomField(cipher.fields, "pop_username", "someuser@nullvalue.test");
    validateCustomField(cipher.fields, "pop_server", "mailserver.nullvalue.test");
    validateCustomField(cipher.fields, "pop_port", "587");
    validateCustomField(cipher.fields, "pop_password", "u1jsf<UI*&YU&^T");
    validateCustomField(cipher.fields, "pop_security", "TLS");
    validateCustomField(cipher.fields, "pop_authentication", "kerberos_v5");
    validateCustomField(cipher.fields, "smtp_server", "mailserver.nullvalue.test");
    validateCustomField(cipher.fields, "smtp_port", "589");
    validateCustomField(cipher.fields, "smtp_username", "someuser@nullvalue.test");
    validateCustomField(cipher.fields, "smtp_password", "(*1674%^UIUJ*UI(IUI8u98uyy");
    validateCustomField(cipher.fields, "smtp_security", "TLS");
    validateCustomField(cipher.fields, "smtp_authentication", "password");
    validateCustomField(cipher.fields, "provider", "Telum");
    validateCustomField(cipher.fields, "provider_website", "https://telum.nullvalue.test");
    validateCustomField(cipher.fields, "phone_local", "2346666666");
    validateCustomField(cipher.fields, "phone_tollfree", "18005557777");
  });

  it("should parse category 112 - API Credentials", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(APICredentialsData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.type).toEqual(CipherType.Login);
    expect(cipher.name).toEqual("API Credential");
    expect(cipher.notes).toEqual("My API Credential");

    expect(cipher.login.username).toEqual("apiuser@nullvalue.test");
    expect(cipher.login.password).toEqual("apiapiapiapiapiapiappy");
    expect(cipher.login.uri).toEqual("http://not.your.everyday.hostname");

    expect(cipher.fields.length).toEqual(4);
    validateCustomField(cipher.fields, "type", "jwt");
    validateCustomField(cipher.fields, "filename", "filename.jwt");
    validateCustomField(cipher.fields, "validFrom", "Mon, 04 Apr 2011 12:01:00 GMT");
    validateCustomField(cipher.fields, "expires", "Tue, 01 Apr 2031 12:01:00 GMT");
  });

  it("should create secure notes", async () => {
    const importer = new Importer();
    const result = await importer.parse(SecureNoteDataJson);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();

    expect(cipher.name).toEqual("Secure Note #1");
    expect(cipher.notes).toEqual(
      "This is my secure note. \n\nLorem ipsum expecto patronum. \nThe quick brown fox jumped over the lazy dog."
    );
    expect(cipher.secureNote.type).toEqual(SecureNoteType.Generic);
  });

  it("should parse category 113 - Medical Record", async () => {
    const importer = new Importer();
    const jsonString = JSON.stringify(MedicalRecordData);
    const result = await importer.parse(jsonString);
    expect(result != null).toBe(true);
    const cipher = result.ciphers.shift();
    expect(cipher.type).toEqual(CipherType.SecureNote);
    expect(cipher.name).toEqual("Some Health Record");
    expect(cipher.notes).toEqual("Some notes about my medical history");
    expect(cipher.secureNote.type).toEqual(SecureNoteType.Generic);

    expect(cipher.fields.length).toEqual(8);
    validateCustomField(cipher.fields, "date", "Sat, 01 Jan 2022 12:01:00 GMT");
    validateCustomField(cipher.fields, "location", "some hospital/clinic");
    validateCustomField(cipher.fields, "healthcareprofessional", "Some Doctor");
    validateCustomField(cipher.fields, "patient", "Me");
    validateCustomField(cipher.fields, "reason", "unwell");
    validateCustomField(cipher.fields, "medication", "Insuline");
    validateCustomField(cipher.fields, "dosage", "1");
    validateCustomField(cipher.fields, "notes", "multiple times a day");
  });

  it("should create folders", async () => {
    const importer = new Importer();
    const result = await importer.parse(SanitizedExportJson);
    expect(result != null).toBe(true);

    const folders = result.folders;
    expect(folders.length).toBe(5);
    expect(folders[0].name).toBe("Movies");
    expect(folders[1].name).toBe("Finance");
    expect(folders[2].name).toBe("Travel");
    expect(folders[3].name).toBe("Education");
    expect(folders[4].name).toBe("Starter Kit");

    // Check that ciphers have a folder assigned to them
    expect(result.ciphers.filter((c) => c.folderId === folders[0].id).length).toBeGreaterThan(0);
    expect(result.ciphers.filter((c) => c.folderId === folders[1].id).length).toBeGreaterThan(0);
    expect(result.ciphers.filter((c) => c.folderId === folders[2].id).length).toBeGreaterThan(0);
    expect(result.ciphers.filter((c) => c.folderId === folders[3].id).length).toBeGreaterThan(0);
    expect(result.ciphers.filter((c) => c.folderId === folders[4].id).length).toBeGreaterThan(0);
  });

  it("should create collections if part of an organization", async () => {
    const importer = new Importer();
    importer.organizationId = Utils.newGuid();
    const result = await importer.parse(SanitizedExportJson);
    expect(result != null).toBe(true);

    const collections = result.collections;
    expect(collections.length).toBe(5);
    expect(collections[0].name).toBe("Movies");
    expect(collections[1].name).toBe("Finance");
    expect(collections[2].name).toBe("Travel");
    expect(collections[3].name).toBe("Education");
    expect(collections[4].name).toBe("Starter Kit");
  });
});
