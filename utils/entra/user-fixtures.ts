import { Jsonify } from "type-fest";

import { UserEntry } from "@/libs/models/userEntry";

// These must match the Entra ID test tenant seed data

const allUsersData: Jsonify<UserEntry>[] = [
  {
    deleted: false,
    disabled: false,
    email: "amarshall@bwrox.dev",
    externalId: "051c89c3-1788-44ce-9ee5-35dc1e6cb794",
    referenceId: "051c89c3-1788-44ce-9ee5-35dc1e6cb794",
  },
  {
    deleted: false,
    disabled: true,
    email: "anders@bwrox.dev",
    externalId: "50fff556-010d-46e2-826a-c86ddf5816dc",
    referenceId: "50fff556-010d-46e2-826a-c86ddf5816dc",
  },
  {
    deleted: false,
    disabled: true,
    email: "disableduser@bwrox.dev",
    externalId: "9e59553d-217e-4010-9b2d-f4458cc861bd",
    referenceId: "9e59553d-217e-4010-9b2d-f4458cc861bd",
  },
  {
    deleted: false,
    disabled: true,
    email: "jcooks@bwrox.dev",
    externalId: "34e12500-13ff-4700-afa0-285757ab7695",
    referenceId: "34e12500-13ff-4700-afa0-285757ab7695",
  },
  {
    deleted: false,
    disabled: false,
    email: "kreynolds@bwrox.dev",
    externalId: "c5d0fdcd-ea09-4ddb-b05d-42c94af705f4",
    referenceId: "c5d0fdcd-ea09-4ddb-b05d-42c94af705f4",
  },
  {
    deleted: false,
    disabled: false,
    email: "trittson@bwrox.dev",
    externalId: "13089061-5d1c-4bb2-bb2a-0d058e4898bc",
    referenceId: "13089061-5d1c-4bb2-bb2a-0d058e4898bc",
  },
];

// Members of Integration Testing Group A: Jordan Cooks, Aaron Marshall, Anders Åberg
const groupAUsersData: Jsonify<UserEntry>[] = [
  {
    deleted: false,
    disabled: false,
    email: "amarshall@bwrox.dev",
    externalId: "051c89c3-1788-44ce-9ee5-35dc1e6cb794",
    referenceId: "051c89c3-1788-44ce-9ee5-35dc1e6cb794",
  },
  {
    deleted: false,
    disabled: true,
    email: "anders@bwrox.dev",
    externalId: "50fff556-010d-46e2-826a-c86ddf5816dc",
    referenceId: "50fff556-010d-46e2-826a-c86ddf5816dc",
  },
  {
    deleted: false,
    disabled: true,
    email: "jcooks@bwrox.dev",
    externalId: "34e12500-13ff-4700-afa0-285757ab7695",
    referenceId: "34e12500-13ff-4700-afa0-285757ab7695",
  },
];

export const allUserFixtures = allUsersData.map((u) => UserEntry.fromJSON(u));
export const groupAUserFixtures = groupAUsersData.map((u) => UserEntry.fromJSON(u));
