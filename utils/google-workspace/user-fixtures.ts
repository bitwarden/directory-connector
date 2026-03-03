import { Jsonify } from "type-fest";

import { UserEntry } from "@/libs/models/userEntry";

// These must match the Google Workspace seed data

const data: Jsonify<UserEntry>[] = [
  // In Group A
  {
    deleted: false,
    disabled: false,
    email: "testuser1@bwrox.dev",
    externalId: "111605910541641314041",
    referenceId: "111605910541641314041",
  },
  // In Groups A + B
  {
    deleted: false,
    disabled: false,
    email: "testuser2@bwrox.dev",
    externalId: "111147009830456099026",
    referenceId: "111147009830456099026",
  },
  // In Group B
  {
    deleted: false,
    disabled: false,
    email: "testuser3@bwrox.dev",
    externalId: "100150970267699397306",
    referenceId: "100150970267699397306",
  },
  // Not in a group
  {
    deleted: false,
    disabled: false,
    email: "testuser4@bwrox.dev",
    externalId: "113764752650306721470",
    referenceId: "113764752650306721470",
  },
  // Disabled user
  {
    deleted: false,
    disabled: true,
    email: "testuser5@bwrox.dev",
    externalId: "110381976819725658200",
    referenceId: "110381976819725658200",
  },
];

export const userFixtures = data.map((g) => UserEntry.fromJSON(g));
