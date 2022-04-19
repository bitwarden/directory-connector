import { IdentityData } from "jslib-common/models/data/identityData";
import { Identity } from "jslib-common/models/domain/identity";

import { mockEnc } from "../utils";

describe("Identity", () => {
  let data: IdentityData;

  beforeEach(() => {
    data = {
      title: "enctitle",
      firstName: "encfirstName",
      middleName: "encmiddleName",
      lastName: "enclastName",
      address1: "encaddress1",
      address2: "encaddress2",
      address3: "encaddress3",
      city: "enccity",
      state: "encstate",
      postalCode: "encpostalCode",
      country: "enccountry",
      company: "enccompany",
      email: "encemail",
      phone: "encphone",
      ssn: "encssn",
      username: "encusername",
      passportNumber: "encpassportNumber",
      licenseNumber: "enclicenseNumber",
    };
  });

  it("Convert from empty", () => {
    const data = new IdentityData();
    const identity = new Identity(data);

    expect(identity).toEqual({
      address1: null,
      address2: null,
      address3: null,
      city: null,
      company: null,
      country: null,
      email: null,
      firstName: null,
      lastName: null,
      licenseNumber: null,
      middleName: null,
      passportNumber: null,
      phone: null,
      postalCode: null,
      ssn: null,
      state: null,
      title: null,
      username: null,
    });
  });

  it("Convert", () => {
    const identity = new Identity(data);

    expect(identity).toEqual({
      title: { encryptedString: "enctitle", encryptionType: 0 },
      firstName: { encryptedString: "encfirstName", encryptionType: 0 },
      middleName: { encryptedString: "encmiddleName", encryptionType: 0 },
      lastName: { encryptedString: "enclastName", encryptionType: 0 },
      address1: { encryptedString: "encaddress1", encryptionType: 0 },
      address2: { encryptedString: "encaddress2", encryptionType: 0 },
      address3: { encryptedString: "encaddress3", encryptionType: 0 },
      city: { encryptedString: "enccity", encryptionType: 0 },
      state: { encryptedString: "encstate", encryptionType: 0 },
      postalCode: { encryptedString: "encpostalCode", encryptionType: 0 },
      country: { encryptedString: "enccountry", encryptionType: 0 },
      company: { encryptedString: "enccompany", encryptionType: 0 },
      email: { encryptedString: "encemail", encryptionType: 0 },
      phone: { encryptedString: "encphone", encryptionType: 0 },
      ssn: { encryptedString: "encssn", encryptionType: 0 },
      username: { encryptedString: "encusername", encryptionType: 0 },
      passportNumber: { encryptedString: "encpassportNumber", encryptionType: 0 },
      licenseNumber: { encryptedString: "enclicenseNumber", encryptionType: 0 },
    });
  });

  it("toIdentityData", () => {
    const identity = new Identity(data);
    expect(identity.toIdentityData()).toEqual(data);
  });

  it("Decrypt", async () => {
    const identity = new Identity();

    identity.title = mockEnc("mockTitle");
    identity.firstName = mockEnc("mockFirstName");
    identity.middleName = mockEnc("mockMiddleName");
    identity.lastName = mockEnc("mockLastName");
    identity.address1 = mockEnc("mockAddress1");
    identity.address2 = mockEnc("mockAddress2");
    identity.address3 = mockEnc("mockAddress3");
    identity.city = mockEnc("mockCity");
    identity.state = mockEnc("mockState");
    identity.postalCode = mockEnc("mockPostalCode");
    identity.country = mockEnc("mockCountry");
    identity.company = mockEnc("mockCompany");
    identity.email = mockEnc("mockEmail");
    identity.phone = mockEnc("mockPhone");
    identity.ssn = mockEnc("mockSsn");
    identity.username = mockEnc("mockUsername");
    identity.passportNumber = mockEnc("mockPassportNumber");
    identity.licenseNumber = mockEnc("mockLicenseNumber");

    const view = await identity.decrypt(null);

    expect(view).toEqual({
      _firstName: "mockFirstName",
      _lastName: "mockLastName",
      _subTitle: null,
      address1: "mockAddress1",
      address2: "mockAddress2",
      address3: "mockAddress3",
      city: "mockCity",
      company: "mockCompany",
      country: "mockCountry",
      email: "mockEmail",
      licenseNumber: "mockLicenseNumber",
      middleName: "mockMiddleName",
      passportNumber: "mockPassportNumber",
      phone: "mockPhone",
      postalCode: "mockPostalCode",
      ssn: "mockSsn",
      state: "mockState",
      title: "mockTitle",
      username: "mockUsername",
    });
  });
});
