import { GroupEntry } from "@/libs/models/groupEntry";

// These must match the OneLogin test tenant seed data.
//
// NOTE: OneLogin returns numeric integer IDs from its API. The externalId / referenceId
// values below, and the entries in userMemberExternalIds, are numbers (not strings) to
// match what the service produces at runtime, even though the model types them as string.
// OneLogin roles do not nest, so groupMemberReferenceIds is always empty.
//
// TODO: Replace all placeholder IDs with the actual values obtained by running a manual
// sync against the provisioned test tenant, then remove this comment.

 

const allGroupsData: any[] = [
  {
    externalId: 9001,
    groupMemberReferenceIds: [],
    name: "Integration Test Role",
    referenceId: 9001,
    userMemberExternalIds: [10000001, 10000002, 10000004],
    users: [],
  },
  {
    externalId: 9002,
    groupMemberReferenceIds: [],
    name: "Default Role",
    referenceId: 9002,
    userMemberExternalIds: [10000003, 10000005],
    users: [],
  },
];

// Filtered by "include: Integration Test Role"
const integrationRoleGroupsData: any[] = [
  {
    externalId: 9001,
    groupMemberReferenceIds: [],
    name: "Integration Test Role",
    referenceId: 9001,
    userMemberExternalIds: [10000001, 10000002, 10000004],
    users: [],
  },
];

 

export const allGroupFixtures = allGroupsData.map((g) => GroupEntry.fromJSON(g));
export const integrationRoleFixtures = integrationRoleGroupsData.map((g) => GroupEntry.fromJSON(g));
