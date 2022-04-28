import { EncString } from "../domain/encString";
import { Identity as IdentityDomain } from "../domain/identity";
import { IdentityView } from "../view/identityView";

export class Identity {
  static template(): Identity {
    const req = new Identity();
    req.title = "Mr";
    req.firstName = "John";
    req.middleName = "William";
    req.lastName = "Doe";
    req.address1 = "123 Any St";
    req.address2 = "Apt #123";
    req.address3 = null;
    req.city = "New York";
    req.state = "NY";
    req.postalCode = "10001";
    req.country = "US";
    req.company = "Acme Inc.";
    req.email = "john@company.com";
    req.phone = "5555551234";
    req.ssn = "000-123-4567";
    req.username = "jdoe";
    req.passportNumber = "US-123456789";
    req.licenseNumber = "D123-12-123-12333";
    return req;
  }

  static toView(req: Identity, view = new IdentityView()) {
    view.title = req.title;
    view.firstName = req.firstName;
    view.middleName = req.middleName;
    view.lastName = req.lastName;
    view.address1 = req.address1;
    view.address2 = req.address2;
    view.address3 = req.address3;
    view.city = req.city;
    view.state = req.state;
    view.postalCode = req.postalCode;
    view.country = req.country;
    view.company = req.company;
    view.email = req.email;
    view.phone = req.phone;
    view.ssn = req.ssn;
    view.username = req.username;
    view.passportNumber = req.passportNumber;
    view.licenseNumber = req.licenseNumber;
    return view;
  }

  static toDomain(req: Identity, domain = new IdentityDomain()) {
    domain.title = req.title != null ? new EncString(req.title) : null;
    domain.firstName = req.firstName != null ? new EncString(req.firstName) : null;
    domain.middleName = req.middleName != null ? new EncString(req.middleName) : null;
    domain.lastName = req.lastName != null ? new EncString(req.lastName) : null;
    domain.address1 = req.address1 != null ? new EncString(req.address1) : null;
    domain.address2 = req.address2 != null ? new EncString(req.address2) : null;
    domain.address3 = req.address3 != null ? new EncString(req.address3) : null;
    domain.city = req.city != null ? new EncString(req.city) : null;
    domain.state = req.state != null ? new EncString(req.state) : null;
    domain.postalCode = req.postalCode != null ? new EncString(req.postalCode) : null;
    domain.country = req.country != null ? new EncString(req.country) : null;
    domain.company = req.company != null ? new EncString(req.company) : null;
    domain.email = req.email != null ? new EncString(req.email) : null;
    domain.phone = req.phone != null ? new EncString(req.phone) : null;
    domain.ssn = req.ssn != null ? new EncString(req.ssn) : null;
    domain.username = req.username != null ? new EncString(req.username) : null;
    domain.passportNumber = req.passportNumber != null ? new EncString(req.passportNumber) : null;
    domain.licenseNumber = req.licenseNumber != null ? new EncString(req.licenseNumber) : null;
    return domain;
  }

  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  address1: string;
  address2: string;
  address3: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  company: string;
  email: string;
  phone: string;
  ssn: string;
  username: string;
  passportNumber: string;
  licenseNumber: string;

  constructor(o?: IdentityView | IdentityDomain) {
    if (o == null) {
      return;
    }

    if (o instanceof IdentityView) {
      this.title = o.title;
      this.firstName = o.firstName;
      this.middleName = o.middleName;
      this.lastName = o.lastName;
      this.address1 = o.address1;
      this.address2 = o.address2;
      this.address3 = o.address3;
      this.city = o.city;
      this.state = o.state;
      this.postalCode = o.postalCode;
      this.country = o.country;
      this.company = o.company;
      this.email = o.email;
      this.phone = o.phone;
      this.ssn = o.ssn;
      this.username = o.username;
      this.passportNumber = o.passportNumber;
      this.licenseNumber = o.licenseNumber;
    } else {
      this.title = o.title?.encryptedString;
      this.firstName = o.firstName?.encryptedString;
      this.middleName = o.middleName?.encryptedString;
      this.lastName = o.lastName?.encryptedString;
      this.address1 = o.address1?.encryptedString;
      this.address2 = o.address2?.encryptedString;
      this.address3 = o.address3?.encryptedString;
      this.city = o.city?.encryptedString;
      this.state = o.state?.encryptedString;
      this.postalCode = o.postalCode?.encryptedString;
      this.country = o.country?.encryptedString;
      this.company = o.company?.encryptedString;
      this.email = o.email?.encryptedString;
      this.phone = o.phone?.encryptedString;
      this.ssn = o.ssn?.encryptedString;
      this.username = o.username?.encryptedString;
      this.passportNumber = o.passportNumber?.encryptedString;
      this.licenseNumber = o.licenseNumber?.encryptedString;
    }
  }
}
