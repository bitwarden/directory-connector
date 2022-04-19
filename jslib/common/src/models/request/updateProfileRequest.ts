export class UpdateProfileRequest {
  name: string;
  masterPasswordHint: string;
  culture = "en-US"; // deprecated

  constructor(name: string, masterPasswordHint: string) {
    this.name = name;
    this.masterPasswordHint = masterPasswordHint ? masterPasswordHint : null;
  }
}
