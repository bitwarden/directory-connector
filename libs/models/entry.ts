export abstract class Entry {
  referenceId: string;
  externalId: string;

  get displayName(): string {
    return this.referenceId;
  }
}
