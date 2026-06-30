import { GroupEntry } from "@/libs/models/groupEntry";

// These must match the OneLogin test tenant seed data.
//
// NOTE: OneLogin returns numeric integer IDs from its API. The externalId / referenceId
// values below, and the entries in userMemberExternalIds, are numbers (not strings) to
// match what the service produces at runtime, even though the model types them as string.
// OneLogin roles do not nest, so groupMemberReferenceIds is always empty.

// Integration Test Role (ID 952807) with its four seeded members.
const allGroupsData: any[] = [
  {
    externalId: 952807,
    groupMemberReferenceIds: [],
    name: "Integration Test Role",
    referenceId: 952807,
    userMemberExternalIds: [260279687, 260279695, 260279698, 260279700],
    users: [],
  },
];

// Filtered by "include: Integration Test Role" — same single role.
const integrationRoleGroupsData: any[] = [
  {
    externalId: 952807,
    groupMemberReferenceIds: [],
    name: "Integration Test Role",
    referenceId: 952807,
    userMemberExternalIds: [260279687, 260279695, 260279698, 260279700],
    users: [],
  },
];

export const allGroupFixtures = allGroupsData.map((g) => GroupEntry.fromJSON(g));
export const integrationRoleFixtures = integrationRoleGroupsData.map((g) => GroupEntry.fromJSON(g));
