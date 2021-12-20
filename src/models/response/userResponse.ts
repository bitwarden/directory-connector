import { UserEntry } from "../userEntry";

export class UserResponse {
  externalId: string;
  displayName: string;

  constructor(u: UserEntry) {
    this.externalId = u.externalId;
    this.displayName = u.displayName;
  }
}
