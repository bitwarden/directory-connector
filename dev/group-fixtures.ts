import { GroupEntry } from "../src/models/groupEntry";

const rawData = [
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

export const groupFixtures = rawData.map((g) => GroupEntry.fromJSON(g));
