import { UserEntry } from "@/libs/models/userEntry";

// These must match the OneLogin test tenant seed data.
//
// NOTE: OneLogin returns numeric integer IDs from its API. The externalId / referenceId
// values below are numbers (not strings) to match what the service produces at runtime,
// even though Entry.externalId is typed as string.
//
// TODO: Replace all placeholder IDs with the actual values obtained by running a manual
// sync against the provisioned test tenant, then remove this comment.

 

const allUsersData: any[] = [
  {
    deleted: false,
    disabled: false,
    email: "user1@test.com",
    externalId: 10000001,
    referenceId: 10000001,
  },
  {
    deleted: false,
    disabled: false,
    email: "user2@test.com",
    externalId: 10000002,
    referenceId: 10000002,
  },
  {
    deleted: false,
    disabled: false,
    email: "user3@test.com",
    externalId: 10000003,
    referenceId: 10000003,
  },
  {
    deleted: false,
    disabled: true,
    email: "suspended@test.com",
    externalId: 10000004,
    referenceId: 10000004,
  },
  {
    deleted: false,
    disabled: false,
    email: "admin@test.com",
    externalId: 10000005,
    referenceId: 10000005,
  },
];

// Members of Integration Test Role: user1, user2, suspended
const integrationRoleUsersData: any[] = [
  {
    deleted: false,
    disabled: false,
    email: "user1@test.com",
    externalId: 10000001,
    referenceId: 10000001,
  },
  {
    deleted: false,
    disabled: false,
    email: "user2@test.com",
    externalId: 10000002,
    referenceId: 10000002,
  },
  {
    deleted: false,
    disabled: true,
    email: "suspended@test.com",
    externalId: 10000004,
    referenceId: 10000004,
  },
];

 

export const allUserFixtures = allUsersData.map((u) => UserEntry.fromJSON(u));
export const integrationRoleUserFixtures = integrationRoleUsersData.map((u) =>
  UserEntry.fromJSON(u),
);
