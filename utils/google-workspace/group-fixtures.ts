import { Jsonify } from "type-fest";

import { GroupEntry } from "../../src/models/groupEntry";

// These must match the Google Workspace seed data

const data: Jsonify<GroupEntry>[] = [
  {
    userMemberExternalIds: [],
    groupMemberReferenceIds: [],
    users: [],
    referenceId: "",
    externalId: "",
    name: "",
  },
];

export const groupFixtures = data.map((g) => GroupEntry.fromJSON(g));
