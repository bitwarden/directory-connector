import { IdentityLinkedId as LinkedId } from "../../enums/linkedIdType";
import { linkedFieldOption } from "../../misc/linkedFieldOption.decorator";
import { Utils } from "../../misc/utils";

import { ItemView } from "./itemView";

export class IdentityView extends ItemView {
  @linkedFieldOption(LinkedId.Title)
  title: string = null;
  @linkedFieldOption(LinkedId.MiddleName)
  middleName: string = null;
  @linkedFieldOption(LinkedId.Address1)
  address1: string = null;
  @linkedFieldOption(LinkedId.Address2)
  address2: string = null;
  @linkedFieldOption(LinkedId.Address3)
  address3: string = null;
  @linkedFieldOption(LinkedId.City, "cityTown")
  city: string = null;
  @linkedFieldOption(LinkedId.State, "stateProvince")
  state: string = null;
  @linkedFieldOption(LinkedId.PostalCode, "zipPostalCode")
  postalCode: string = null;
  @linkedFieldOption(LinkedId.Country)
  country: string = null;
  @linkedFieldOption(LinkedId.Company)
  company: string = null;
  @linkedFieldOption(LinkedId.Email)
  email: string = null;
  @linkedFieldOption(LinkedId.Phone)
  phone: string = null;
  @linkedFieldOption(LinkedId.Ssn)
  ssn: string = null;
  @linkedFieldOption(LinkedId.Username)
  username: string = null;
  @linkedFieldOption(LinkedId.PassportNumber)
  passportNumber: string = null;
  @linkedFieldOption(LinkedId.LicenseNumber)
  licenseNumber: string = null;

  private _firstName: string = null;
  private _lastName: string = null;
  private _subTitle: string = null;

  constructor() {
    super();
  }

  @linkedFieldOption(LinkedId.FirstName)
  get firstName(): string {
    return this._firstName;
  }
  set firstName(value: string) {
    this._firstName = value;
    this._subTitle = null;
  }

  @linkedFieldOption(LinkedId.LastName)
  get lastName(): string {
    return this._lastName;
  }
  set lastName(value: string) {
    this._lastName = value;
    this._subTitle = null;
  }

  get subTitle(): string {
    if (this._subTitle == null && (this.firstName != null || this.lastName != null)) {
      this._subTitle = "";
      if (this.firstName != null) {
        this._subTitle = this.firstName;
      }
      if (this.lastName != null) {
        if (this._subTitle !== "") {
          this._subTitle += " ";
        }
        this._subTitle += this.lastName;
      }
    }

    return this._subTitle;
  }

  @linkedFieldOption(LinkedId.FullName)
  get fullName(): string {
    if (
      this.title != null ||
      this.firstName != null ||
      this.middleName != null ||
      this.lastName != null
    ) {
      let name = "";
      if (this.title != null) {
        name += this.title + " ";
      }
      if (this.firstName != null) {
        name += this.firstName + " ";
      }
      if (this.middleName != null) {
        name += this.middleName + " ";
      }
      if (this.lastName != null) {
        name += this.lastName;
      }
      return name.trim();
    }

    return null;
  }

  get fullAddress(): string {
    let address = this.address1;
    if (!Utils.isNullOrWhitespace(this.address2)) {
      if (!Utils.isNullOrWhitespace(address)) {
        address += ", ";
      }
      address += this.address2;
    }
    if (!Utils.isNullOrWhitespace(this.address3)) {
      if (!Utils.isNullOrWhitespace(address)) {
        address += ", ";
      }
      address += this.address3;
    }
    return address;
  }

  get fullAddressPart2(): string {
    if (this.city == null && this.state == null && this.postalCode == null) {
      return null;
    }
    const city = this.city || "-";
    const state = this.state;
    const postalCode = this.postalCode || "-";
    let addressPart2 = city;
    if (!Utils.isNullOrWhitespace(state)) {
      addressPart2 += ", " + state;
    }
    addressPart2 += ", " + postalCode;
    return addressPart2;
  }
}
