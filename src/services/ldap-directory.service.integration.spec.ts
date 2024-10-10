import { mock, MockProxy } from "jest-mock-extended";

import { I18nService } from "../../jslib/common/src/abstractions/i18n.service";
import { LogService } from "../../jslib/common/src/abstractions/log.service";
import { groupFixtures } from "../../openldap/group-fixtures";
import { userFixtures } from "../../openldap/user-fixtures";
import { DirectoryType } from "../enums/directoryType";
import { LdapConfiguration } from "../models/ldapConfiguration";
import { SyncConfiguration } from "../models/syncConfiguration";

import { LdapDirectoryService } from "./ldap-directory.service";
import { StateService } from "./state.service";

// These tests integrate with the OpenLDAP docker image and seed data located in the openldap folder.
// To run theses tests:
//  Install mkcert, e.g.: brew install mkcert
//  Configure the environment: npm run test:integration:setup
//  Run tests: npm run test:integration:watch

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
    stateService.getLastUserSync.mockResolvedValue(null); // do not filter results by last modified date
    i18nService.t.mockImplementation((id) => id); // passthrough implementation for any error  messages

    directoryService = new LdapDirectoryService(logService, i18nService, stateService);
  });

  describe("basic sync fetching users and groups", () => {
    it("with an unencrypted connection", async () => {
      stateService.getDirectory
        .calledWith(DirectoryType.Ldap)
        .mockResolvedValue(getLdapConfiguration());
      stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));

      const result = await directoryService.getEntries(true, true);
      expect(result).toEqual([groupFixtures, userFixtures]);
    });

    // StartTLS opportunistically encrypts an otherwise unencrypted connection and therefore uses the same port
    it("with StartTLS + SSL", async () => {
      stateService.getDirectory.calledWith(DirectoryType.Ldap).mockResolvedValue(
        getLdapConfiguration({
          ssl: true,
          startTls: true,
          tlsCaPath: "./openldap/certs/rootCA.pem",
        }),
      );
      stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));

      const result = await directoryService.getEntries(true, true);
      expect(result).toEqual([groupFixtures, userFixtures]);
    });

    // The ldaps protocol requires use of SSL and uses the secure port
    it("with SSL using the ldaps protocol", async () => {
      stateService.getDirectory.calledWith(DirectoryType.Ldap).mockResolvedValue(
        getLdapConfiguration({
          port: 1636,
          ssl: true,
          sslCaPath: "./openldap/certs/rootCA.pem",
        }),
      );
      stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));

      const result = await directoryService.getEntries(true, true);
      expect(result).toEqual([groupFixtures, userFixtures]);
    });
  });

  describe("users", () => {
    it("respects the users path", async () => {
      stateService.getDirectory
        .calledWith(DirectoryType.Ldap)
        .mockResolvedValue(getLdapConfiguration());
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          users: true,
          userPath: "ou=Human Resources",
        }),
      );

      // These users are in the Human Resources ou
      const hrUsers = userFixtures.filter(
        (u) =>
          u.referenceId === "cn=Roland Dyke,ou=Human Resources,dc=bitwarden,dc=com" ||
          u.referenceId === "cn=Charin Goulfine,ou=Human Resources,dc=bitwarden,dc=com" ||
          u.referenceId === "cn=Angelle Guarino,ou=Human Resources,dc=bitwarden,dc=com",
      );

      const result = await directoryService.getEntries(true, true);
      expect(result[1]).toEqual(expect.arrayContaining(hrUsers));
      expect(result[1].length).toEqual(hrUsers.length);
    });

    it("filters users", async () => {
      stateService.getDirectory
        .calledWith(DirectoryType.Ldap)
        .mockResolvedValue(getLdapConfiguration());
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({ users: true, userFilter: "(cn=Roland Dyke)" }),
      );

      const roland = userFixtures.find(
        (u) => u.referenceId === "cn=Roland Dyke,ou=Human Resources,dc=bitwarden,dc=com",
      );
      const result = await directoryService.getEntries(true, true);
      expect(result).toEqual([undefined, [roland]]);
    });
  });

  describe("groups", () => {
    it("respects the groups path", async () => {
      stateService.getDirectory
        .calledWith(DirectoryType.Ldap)
        .mockResolvedValue(getLdapConfiguration());
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          groups: true,
          groupPath: "ou=Janitorial",
        }),
      );

      // These groups are in the Janitorial ou
      const janitorialGroups = groupFixtures.filter((g) => g.name === "Cleaners");

      const result = await directoryService.getEntries(true, true);
      expect(result).toEqual([janitorialGroups, undefined]);
    });

    it("filters groups", async () => {
      stateService.getDirectory
        .calledWith(DirectoryType.Ldap)
        .mockResolvedValue(getLdapConfiguration());
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({ groups: true, groupFilter: "(cn=Red Team)" }),
      );

      const redTeam = groupFixtures.find(
        (u) => u.referenceId === "cn=Red Team,dc=bitwarden,dc=com",
      );
      const result = await directoryService.getEntries(true, true);
      expect(result).toEqual([[redTeam], undefined]);
    });
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
