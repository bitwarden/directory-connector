import { mock, MockProxy } from "jest-mock-extended";

import { groupFixtures } from "../../dev/group-fixtures";
import { userFixtures } from "../../dev/user-fixtures";
import { I18nService } from "../../jslib/common/src/abstractions/i18n.service";
import { LogService } from "../../jslib/common/src/abstractions/log.service";
import { DirectoryType } from "../enums/directoryType";
import { LdapConfiguration } from "../models/ldapConfiguration";
import { SyncConfiguration } from "../models/syncConfiguration";

import { LdapDirectoryService } from "./ldap-directory.service";
import { StateService } from "./state.service";

describe("ldapDirectoryService", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;

  let directoryService: LdapDirectoryService;

  beforeEach(() => {
    logService = mock();
    i18nService = mock();
    stateService = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.Ldap);
    i18nService.t.mockImplementation((id) => id);

    directoryService = new LdapDirectoryService(logService, i18nService, stateService);
  });

  it("gets users and groups without TLS", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
    stateService.getLastUserSync.mockResolvedValue(null);

    const result = await directoryService.getEntries(true, true);
    expect(result).toEqual([groupFixtures, userFixtures]);
  });

  it("filters users correctly", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());
    stateService.getSync.mockResolvedValue(
      getSyncConfiguration({ groups: false, users: true, userFilter: "(cn=Roland Dyke)" }),
    );
    stateService.getLastUserSync.mockResolvedValue(null);

    const roland = userFixtures.find(
      (u) => u.referenceId === "cn=Roland Dyke,ou=Human Resources,dc=bitwarden,dc=com",
    );
    const result = await directoryService.getEntries(true, true);
    expect(result).toEqual([undefined, [roland]]);
  });
});

/**
 * @returns a basic ldap configuration without TLS/SSL enabled. Can be overridden by passing in a partial configuration.
 */
const getLdapConfiguration = (config?: Partial<LdapConfiguration>): LdapConfiguration => ({
  ssl: false,
  startTls: false,
  tlsCaPath: null,
  sslAllowUnauthorized: false,
  sslCertPath: null,
  sslKeyPath: null,
  sslCaPath: null,
  hostname: "localhost",
  port: 389,
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
const getSyncConfiguration = (config?: Partial<SyncConfiguration>): SyncConfiguration => ({
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