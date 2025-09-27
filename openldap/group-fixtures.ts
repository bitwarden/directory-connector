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
  {
    userMemberExternalIds: [
      "cn=Shiela Harada,ou=Peons,dc=bitwarden,dc=com",
      "cn=Micaela Doud,ou=Janitorial,dc=bitwarden,dc=com",
    ],
    groupMemberReferenceIds: [],
    users: [],
    referenceId: "cn=Red Team,dc=bitwarden,dc=com",
    externalId: "cn=Red Team,dc=bitwarden,dc=com",
    name: "Red Team",
  },
  {
    userMemberExternalIds: [],
    groupMemberReferenceIds: [],
    users: [],
    referenceId: "cn=Cleaners,ou=Janitorial,dc=bitwarden,dc=com",
    externalId: "cn=Cleaners,ou=Janitorial,dc=bitwarden,dc=com",
    name: "Cleaners",
  },
  {
    userMemberExternalIds: [
      "cn=Painterson Miki,ou=Product Development,dc=bitwarden,dc=com",
      "cn=Virgina Pichocki,ou=Product Development,dc=bitwarden,dc=com",
      "cn=Steffen Carsten,ou=Product Development,dc=bitwarden,dc=com",
    ],
    groupMemberReferenceIds: [],
    users: [],
    referenceId: "cn=DevOps Team,dc=bitwarden,dc=com",
    externalId: "cn=DevOps Team,dc=bitwarden,dc=com",
    name: "DevOps Team",
  },
  {
    userMemberExternalIds: [
      "cn=Angus Merizzi,ou=Management,dc=bitwarden,dc=com",
      "cn=Grissel Currer,ou=Management,dc=bitwarden,dc=com",
    ],
    groupMemberReferenceIds: [],
    users: [],
    referenceId: "cn=Security Team,dc=bitwarden,dc=com",
    externalId: "cn=Security Team,dc=bitwarden,dc=com",
    name: "Security Team",
  },
];

export const groupFixtures = data.map((g) => GroupEntry.fromJSON(g));
