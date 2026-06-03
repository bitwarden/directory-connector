import { Jsonify } from "type-fest";

import { GroupEntry } from "@/libs/models/groupEntry";

// These must match the Entra ID test tenant seed data

const allGroupsData: Jsonify<GroupEntry>[] = [
  {
    externalId: "573783bf-d086-4e1e-9084-4b7b0d2a5969",
    groupMemberReferenceIds: [],
    name: "Integration Testing Group A",
    referenceId: "573783bf-d086-4e1e-9084-4b7b0d2a5969",
    userMemberExternalIds: [
      "34e12500-13ff-4700-afa0-285757ab7695",
      "051c89c3-1788-44ce-9ee5-35dc1e6cb794",
      "50fff556-010d-46e2-826a-c86ddf5816dc",
    ],
    users: [],
  },
  {
    externalId: "66578c29-73af-448b-b352-301f9588772b",
    groupMemberReferenceIds: [],
    name: "Integration Testing Group B",
    referenceId: "66578c29-73af-448b-b352-301f9588772b",
    userMemberExternalIds: [],
    users: [],
  },
];

const filteredGroupsData: Jsonify<GroupEntry>[] = [
  {
    externalId: "573783bf-d086-4e1e-9084-4b7b0d2a5969",
    groupMemberReferenceIds: [],
    name: "Integration Testing Group A",
    referenceId: "573783bf-d086-4e1e-9084-4b7b0d2a5969",
    userMemberExternalIds: [
      "34e12500-13ff-4700-afa0-285757ab7695",
      "051c89c3-1788-44ce-9ee5-35dc1e6cb794",
      "50fff556-010d-46e2-826a-c86ddf5816dc",
    ],
    users: [],
  },
];

export const allGroupFixtures = allGroupsData.map((g) => GroupEntry.fromJSON(g));
export const filteredGroupFixtures = filteredGroupsData.map((g) => GroupEntry.fromJSON(g));
