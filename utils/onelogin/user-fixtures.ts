import { UserEntry } from "@/libs/models/userEntry";

// These must match the OneLogin test tenant seed data.
//
// NOTE: OneLogin returns numeric integer IDs from its API. The externalId / referenceId
// values below are numbers (not strings) to match what the service produces at runtime,
// even though Entry.externalId is typed as string.

 

// All four seeded integration test users; all are members of Integration Test Role (952807).
// testuser4 has status 2 (suspended/locked) → disabled: true
const allUsersData: any[] = [
  {
    deleted: false,
    disabled: false,
    email: "testuser1@bwrox.dev",
    externalId: 260279687,
    referenceId: 260279687,
  },
  {
    deleted: false,
    disabled: false,
    email: "testuser2@bwrox.dev",
    externalId: 260279695,
    referenceId: 260279695,
  },
  {
    deleted: false,
    disabled: false,
    email: "testuser3@bwrox.dev",
    externalId: 260279698,
    referenceId: 260279698,
  },
  {
    deleted: false,
    disabled: true,
    email: "testuser4@bwrox.dev",
    externalId: 260279700,
    referenceId: 260279700,
  },
];

// All four users belong to Integration Test Role, so the filtered set is the same.
const integrationRoleUsersData: any[] = [
  {
    deleted: false,
    disabled: false,
    email: "testuser1@bwrox.dev",
    externalId: 260279687,
    referenceId: 260279687,
  },
  {
    deleted: false,
    disabled: false,
    email: "testuser2@bwrox.dev",
    externalId: 260279695,
    referenceId: 260279695,
  },
  {
    deleted: false,
    disabled: false,
    email: "testuser3@bwrox.dev",
    externalId: 260279698,
    referenceId: 260279698,
  },
  {
    deleted: false,
    disabled: true,
    email: "testuser4@bwrox.dev",
    externalId: 260279700,
    referenceId: 260279700,
  },
];

 

export const allUserFixtures = allUsersData.map((u) => UserEntry.fromJSON(u));
export const integrationRoleUserFixtures = integrationRoleUsersData.map((u) =>
  UserEntry.fromJSON(u),
);
