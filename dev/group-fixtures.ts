import { Jsonify } from "type-fest";

import { GroupEntry } from "../src/models/groupEntry";

// These must match the ldap server seed data in directory.ldif
const data: Jsonify<GroupEntry>[] = [
  {
    userMemberExternalIds: [
      "cn=Loella Mak,ou=Payroll,dc=bitwarden,dc=com",
      "cn=Painterson Miki,ou=Product Development,dc=bitwarden,dc=com",
      "cn=Roland Dyke,ou=Human Resources,dc=bitwarden,dc=com",
    ],
    groupMemberReferenceIds: [],
    users: [],
    referenceId: "cn=Blue Team,dc=bitwarden,dc=com",
    externalId: "cn=Blue Team,dc=bitwarden,dc=com",
    name: "Blue Team",
  },
];

export const groupFixtures = data.map((g) => GroupEntry.fromJSON(g));
