import Domain from "./domainBase";

export class PasswordGeneratorPolicyOptions extends Domain {
  defaultType = "";
  minLength = 0;
  useUppercase = false;
  useLowercase = false;
  useNumbers = false;
  numberCount = 0;
  useSpecial = false;
  specialCount = 0;
  minNumberWords = 0;
  capitalize = false;
  includeNumber = false;

  inEffect() {
    return (
      this.defaultType !== "" ||
      this.minLength > 0 ||
      this.numberCount > 0 ||
      this.specialCount > 0 ||
      this.useUppercase ||
      this.useLowercase ||
      this.useNumbers ||
      this.useSpecial ||
      this.minNumberWords > 0 ||
      this.capitalize ||
      this.includeNumber
    );
  }
}
