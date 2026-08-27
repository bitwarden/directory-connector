import { Jsonify } from "type-fest";

import { GroupEntry } from "@/libs/models/groupEntry";

// These must match the Okta test organization seed data

const allGroupsData: Jsonify<GroupEntry>[] = [
  {
    externalId: "00g13jy2er60PtjR6698",
    groupMemberReferenceIds: [],
    name: "Everyone",
    referenceId: "00g13jy2er60PtjR6698",
    userMemberExternalIds: [
      "00u13jy2et80wo2TC698",
      "00u13t7eifbXFPQKW698",
      "00u13t7bhpibaNW40698",
      "00u13t7c00brmAXIO698",
      "00u13t7bh9uQY8CwD698",
    ],
    users: [],
  },
  {
    externalId: "00g13t7g25qkwrnUA698",
    groupMemberReferenceIds: [],
    name: "Integration Test Group A",
    referenceId: "00g13t7g25qkwrnUA698",
    userMemberExternalIds: ["00u13t7eifbXFPQKW698", "00u13t7bh9uQY8CwD698"],
    users: [],
  },
  {
    externalId: "00g13t7h40rER5bQH698",
    groupMemberReferenceIds: [],
    name: "Integration Test Group B",
    referenceId: "00g13t7h40rER5bQH698",
    userMemberExternalIds: ["00u13t7eifbXFPQKW698", "00u13t7bhpibaNW40698", "00u13t7c00brmAXIO698"],
    users: [],
  },
  {
    externalId: "00g13jy2er7W7aWYO698",
    groupMemberReferenceIds: [],
    name: "Okta Administrators",
    referenceId: "00g13jy2er7W7aWYO698",
    userMemberExternalIds: [],
    users: [],
  },
];

// Filtered by "include: Integration Test Group A,Integration Test Group B"
const integrationGroupsData: Jsonify<GroupEntry>[] = [
  {
    externalId: "00g13t7g25qkwrnUA698",
    groupMemberReferenceIds: [],
    name: "Integration Test Group A",
    referenceId: "00g13t7g25qkwrnUA698",
    userMemberExternalIds: ["00u13t7eifbXFPQKW698", "00u13t7bh9uQY8CwD698"],
    users: [],
  },
  {
    externalId: "00g13t7h40rER5bQH698",
    groupMemberReferenceIds: [],
    name: "Integration Test Group B",
    referenceId: "00g13t7h40rER5bQH698",
    userMemberExternalIds: ["00u13t7eifbXFPQKW698", "00u13t7bhpibaNW40698", "00u13t7c00brmAXIO698"],
    users: [],
  },
];

export const allGroupFixtures = allGroupsData.map((g) => GroupEntry.fromJSON(g));
export const integrationGroupFixtures = integrationGroupsData.map((g) => GroupEntry.fromJSON(g));
