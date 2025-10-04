import { GSuiteConfiguration } from "../../src/models/gsuiteConfiguration";
import { SyncConfiguration } from "../../src/models/syncConfiguration";

/**
 * @returns a basic GSuite configuration. Can be overridden by passing in a partial configuration.
 */
export const getGSuiteConfiguration = (
  config?: Partial<GSuiteConfiguration>,
): GSuiteConfiguration => ({
  // TODO
  clientEmail: "",
  privateKey: "",
  domain: "",
  adminUser: "",
  customer: "",
  ...(config ?? {}),
});

/**
 * @returns a basic Google Workspace sync configuration. Can be overridden by passing in a partial configuration.
 */
export const getSyncConfiguration = (config?: Partial<SyncConfiguration>): SyncConfiguration => ({
  // TODO
  users: false,
  groups: false,
  interval: 5,
  userFilter: null,
  groupFilter: null,
  removeDisabled: false,
  overwriteExisting: false,
  largeImport: false,
  // Ldap properties
  groupObjectClass: "posixGroup",
  userObjectClass: "person",
  groupPath: null,
  userPath: null,
  groupNameAttribute: "cn",
  userEmailAttribute: "mail",
  memberAttribute: "memberUid",
  useEmailPrefixSuffix: false,
  emailPrefixAttribute: "sAMAccountName",
  emailSuffix: null,
  creationDateAttribute: "whenCreated",
  revisionDateAttribute: "whenChanged",
  ...(config ?? {}),
});
