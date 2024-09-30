import { UserEntry } from "../src/models/userEntry";

// These must match the ldap server seed data in directory.ldif
const rawTestUserEntries = [
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Roland Dyke,ou=Human Resources,dc=bitwarden,dc=com",
    externalId: "cn=Roland Dyke,ou=Human Resources,dc=bitwarden,dc=com",
    email: "dyker@220af87272f04218bb8dd81d50fb19f5.bitwarden.com",
  },
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Charin Goulfine,ou=Human Resources,dc=bitwarden,dc=com",
    externalId: "cn=Charin Goulfine,ou=Human Resources,dc=bitwarden,dc=com",
    email: "goulfinc@5fa9a69302a9422abedbd51aa69f472b.bitwarden.com",
  },
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Margit Peters,ou=Product Testing,dc=bitwarden,dc=com",
    externalId: "cn=Margit Peters,ou=Product Testing,dc=bitwarden,dc=com",
    email: "petersm@909269ac94be4e5b9ff6809f52b1dda3.bitwarden.com",
  },
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Shiela Harada,ou=Peons,dc=bitwarden,dc=com",
    externalId: "cn=Shiela Harada,ou=Peons,dc=bitwarden,dc=com",
    email: "haradas@2782a7fada1240d682fc754affb31519.bitwarden.com",
  },
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Angelle Guarino,ou=Human Resources,dc=bitwarden,dc=com",
    externalId: "cn=Angelle Guarino,ou=Human Resources,dc=bitwarden,dc=com",
    email: "guarinoa@720ab4266da34c8e9ccf5ef3370b892b.bitwarden.com",
  },
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Shela Khoury,ou=Peons,dc=bitwarden,dc=com",
    externalId: "cn=Shela Khoury,ou=Peons,dc=bitwarden,dc=com",
    email: "khourys@4dc1a2d970bb4c23aef0d860b6018ed6.bitwarden.com",
  },
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Micaela Doud,ou=Janitorial,dc=bitwarden,dc=com",
    externalId: "cn=Micaela Doud,ou=Janitorial,dc=bitwarden,dc=com",
    email: "doudm@b2de0606c7904578b184a63046aa1a59.bitwarden.com",
  },
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Marthe Kenik,ou=Product Testing,dc=bitwarden,dc=com",
    externalId: "cn=Marthe Kenik,ou=Product Testing,dc=bitwarden,dc=com",
    email: "kenikm@5ce7099e829941498f32f6630dda9440.bitwarden.com",
  },
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Angus Merizzi,ou=Management,dc=bitwarden,dc=com",
    externalId: "cn=Angus Merizzi,ou=Management,dc=bitwarden,dc=com",
    email: "merizzia@7f1912f54e7a4efa8a33a6ba82fc7102.bitwarden.com",
  },
  {
    disabled: false,
    deleted: false,
    referenceId: "cn=Edmund Kardos,ou=Product Testing,dc=bitwarden,dc=com",
    externalId: "cn=Edmund Kardos,ou=Product Testing,dc=bitwarden,dc=com",
    email: "kardose@5f41ae90bad64d5e97b0ef849f0cfd8f.bitwarden.com",
  },
];

export const testUserEntries = rawTestUserEntries.map((v) => UserEntry.fromJSON(v));
