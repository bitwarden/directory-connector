import { Jsonify } from "type-fest";

import { Entry } from "./entry";

export class UserEntry extends Entry {
  email: string;
  disabled = false;
  deleted = false;

  get displayName(): string {
    if (this.email == null) {
      return this.referenceId;
    }

    return this.email;
  }

  toJSON() {
    return {
      referenceId: this.referenceId,
      externalId: this.externalId,
      email: this.email,
      disabled: this.disabled,
      deleted: this.deleted,
    };
  }

  static fromJSON(data: Jsonify<UserEntry>) {
    const result = new UserEntry();
    result.referenceId = data.referenceId;
    result.externalId = data.externalId;

    result.email = data.email;
    result.disabled = data.disabled;
    result.deleted = data.deleted;

    return result;
  }
}
