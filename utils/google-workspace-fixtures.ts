import { Jsonify } from "type-fest";

import { GroupEntry } from "../src/models/groupEntry";
import { UserEntry } from "../src/models/userEntry";

// These must match the Google Workspace seed data

const userData: Jsonify<UserEntry>[] = [
  {
    disabled: false,
    deleted: false,
    referenceId: "",
    externalId: "",
    email: "",
  },
];

const groupData: Jsonify<GroupEntry>[] = [
  {
    userMemberExternalIds: [],
    groupMemberReferenceIds: [],
    users: [],
    referenceId: "",
    externalId: "",
    name: "",
  },
];

export const userFixtures = userData.map((g) => UserEntry.fromJSON(g));
export const groupFixtures = groupData.map((g) => GroupEntry.fromJSON(g));
