import { LdapConfiguration } from "../models/ldapConfiguration";
import { SyncConfiguration } from "../models/syncConfiguration";

/**
 * @returns a basic ldap configuration without TLS/SSL enabled. Can be overridden by passing in a partial configuration.
 */
export const getLdapConfiguration = (config?: Partial<LdapConfiguration>): LdapConfiguration => ({
  ssl: false,
  startTls: false,
  tlsCaPath: null,
  sslAllowUnauthorized: false,
  sslCertPath: null,
  sslKeyPath: null,
  sslCaPath: null,
  hostname: "localhost",
  port: 1389,
  domain: null,
  rootPath: "dc=bitwarden,dc=com",
  currentUser: false,
  username: "cn=admin,dc=bitwarden,dc=com",
  password: "admin",
  ad: false,
  pagedSearch: false,
  ...(config ?? {}),
});

/**
 * @returns a basic sync configuration. Can be overridden by passing in a partial configuration.
 */
export const getSyncConfiguration = (config?: Partial<SyncConfiguration>): SyncConfiguration => ({
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
