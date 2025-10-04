import { Jsonify } from "type-fest";

import { UserEntry } from "../../src/models/userEntry";

// These must match the Google Workspace seed data

const data: Jsonify<UserEntry>[] = [
  {
    disabled: false,
    deleted: false,
    referenceId: "",
    externalId: "",
    email: "",
  },
];

export const userFixtures = data.map((g) => UserEntry.fromJSON(g));
