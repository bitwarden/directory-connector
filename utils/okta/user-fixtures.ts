import { Jsonify } from "type-fest";

import { UserEntry } from "@/libs/models/userEntry";

// These must match the Okta test organization seed data

const allUsersData: Jsonify<UserEntry>[] = [
  {
    deleted: false,
    disabled: false,
    email: "btreston@bitwarden.com",
    externalId: "00u13jy2et80wo2TC698",
    referenceId: "00u13jy2et80wo2TC698",
  },
  {
    deleted: false,
    disabled: false,
    email: "timo@test.com",
    externalId: "00u13t7bh9uQY8CwD698",
    referenceId: "00u13t7bh9uQY8CwD698",
  },
  {
    deleted: false,
    disabled: false,
    email: "max@test.com",
    externalId: "00u13t7bhpibaNW40698",
    referenceId: "00u13t7bhpibaNW40698",
  },
  {
    deleted: false,
    disabled: false,
    email: "oscar@test.com",
    externalId: "00u13t7c00brmAXIO698",
    referenceId: "00u13t7c00brmAXIO698",
  },
  {
    deleted: false,
    disabled: false,
    email: "jimmy@test.com",
    externalId: "00u13t7eifbXFPQKW698",
    referenceId: "00u13t7eifbXFPQKW698",
  },
];

// Members of Integration Test Group A: Jimmy, Timo
const groupAUsersData: Jsonify<UserEntry>[] = [
  {
    deleted: false,
    disabled: false,
    email: "timo@test.com",
    externalId: "00u13t7bh9uQY8CwD698",
    referenceId: "00u13t7bh9uQY8CwD698",
  },
  {
    deleted: false,
    disabled: false,
    email: "jimmy@test.com",
    externalId: "00u13t7eifbXFPQKW698",
    referenceId: "00u13t7eifbXFPQKW698",
  },
];

// Union of Integration Test Group A and B members: Timo, Jimmy, Max, Oscar
const integrationGroupUsersData: Jsonify<UserEntry>[] = [
  {
    deleted: false,
    disabled: false,
    email: "timo@test.com",
    externalId: "00u13t7bh9uQY8CwD698",
    referenceId: "00u13t7bh9uQY8CwD698",
  },
  {
    deleted: false,
    disabled: false,
    email: "max@test.com",
    externalId: "00u13t7bhpibaNW40698",
    referenceId: "00u13t7bhpibaNW40698",
  },
  {
    deleted: false,
    disabled: false,
    email: "oscar@test.com",
    externalId: "00u13t7c00brmAXIO698",
    referenceId: "00u13t7c00brmAXIO698",
  },
  {
    deleted: false,
    disabled: false,
    email: "jimmy@test.com",
    externalId: "00u13t7eifbXFPQKW698",
    referenceId: "00u13t7eifbXFPQKW698",
  },
];

export const allUserFixtures = allUsersData.map((u) => UserEntry.fromJSON(u));
export const groupAUserFixtures = groupAUsersData.map((u) => UserEntry.fromJSON(u));
export const integrationGroupUserFixtures = integrationGroupUsersData.map((u) =>
  UserEntry.fromJSON(u),
);
