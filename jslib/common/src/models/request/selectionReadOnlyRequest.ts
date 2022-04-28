export class SelectionReadOnlyRequest {
  id: string;
  readOnly: boolean;
  hidePasswords: boolean;

  constructor(id: string, readOnly: boolean, hidePasswords: boolean) {
    this.id = id;
    this.readOnly = readOnly;
    this.hidePasswords = hidePasswords;
  }
}
