import { Jsonify } from "type-fest";

import { GroupEntry } from "@/libs/models/groupEntry";

// These must match the Google Workspace seed data

const data: Jsonify<GroupEntry>[] = [
  {
    externalId: "0319y80a3anpxhj",
    groupMemberReferenceIds: [],
    name: "Integration Test Group A",
    referenceId: "0319y80a3anpxhj",
    userMemberExternalIds: ["111605910541641314041", "111147009830456099026"],
    users: [],
  },
  {
    externalId: "02afmg28317uyub",
    groupMemberReferenceIds: [],
    name: "Integration Test Group B",
    referenceId: "02afmg28317uyub",
    userMemberExternalIds: ["111147009830456099026", "100150970267699397306"],
    users: [],
  },
];

export const groupFixtures = data.map((g) => GroupEntry.fromJSON(g));
