import { Entry } from "./entry";

export class UserEntry extends Entry {
  email: string;
  disabled = false;
  deleted = false;
  creationDate: Date = null;
  deletionDate: Date = null;

  get displayName(): string {
    if (this.email == null) {
      return this.referenceId;
    }

    return this.email;
  }

  get relevantDate(): Date {
    if (this.deleted) {
      return this.deletionDate;
    }
    return this.creationDate;
  }

  newerThan(other: UserEntry): boolean {
    if (this.relevantDate != null && other.relevantDate != null) {
      return this.relevantDate > other.relevantDate;
    }
    return false;
  }
}
