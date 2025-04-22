import { mock, MockProxy } from "jest-mock-extended";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { EnvironmentService } from "@/jslib/common/src/services/environment.service";

import { I18nService } from "../../jslib/common/src/abstractions/i18n.service";
import { LogService } from "../../jslib/common/src/abstractions/log.service";
import { groupFixtures } from "../../openldap/group-fixtures";
import { userFixtures } from "../../openldap/user-fixtures";
import { DirectoryFactoryService } from "../abstractions/directory-factory.service";
import { DirectoryType } from "../enums/directoryType";
import { getLdapConfiguration, getSyncConfiguration } from "../utils/test-fixtures";

import { BatchRequestBuilder } from "./batch-request-builder";
import { LdapDirectoryService } from "./ldap-directory.service";
import { SingleRequestBuilder } from "./single-request-builder";
import { StateService } from "./state.service";
import { SyncService } from "./sync.service";
import * as constants from "./sync.service";

// These tests integrate with the OpenLDAP docker image and seed data located in the openldap folder.
// To run theses tests:
//  Install mkcert, e.g.: brew install mkcert
//  Configure the environment: npm run test:integration:setup
//  Run tests: npm run test:integration:watch

describe("ldapDirectoryService", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;
  let cryptoFunctionService: MockProxy<CryptoFunctionService>;
  let apiService: MockProxy<ApiService>;
  let messagingService: MockProxy<MessagingService>;
  let environmentService: MockProxy<EnvironmentService>;
  let directoryFactory: MockProxy<DirectoryFactoryService>;

  let batchRequestBuilder: BatchRequestBuilder;
  let singleRequestBuilder: SingleRequestBuilder;
  let syncService: SyncService;
  let directoryService: LdapDirectoryService;

  beforeEach(() => {
    logService = mock();
    i18nService = mock();
    stateService = mock();
    cryptoFunctionService = mock();
    apiService = mock();
    messagingService = mock();
    environmentService = mock();
    directoryFactory = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.Ldap);
    stateService.getOrganizationId.mockResolvedValue("fakeId");
    stateService.getLastUserSync.mockResolvedValue(null); // do not filter results by last modified date
    i18nService.t.mockImplementation((id) => id); // passthrough implementation for any error  messages

    directoryService = new LdapDirectoryService(logService, i18nService, stateService);
    directoryFactory.createService.mockReturnValue(directoryService);

    batchRequestBuilder = new BatchRequestBuilder();
    singleRequestBuilder = new SingleRequestBuilder();

    syncService = new SyncService(
      cryptoFunctionService,
      apiService,
      messagingService,
      i18nService,
      environmentService,
      stateService,
      batchRequestBuilder,
      singleRequestBuilder,
      directoryFactory,
    );
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

    it("with largeImport disabled matches directory fixture data", async () => {
      stateService.getDirectory
        .calledWith(DirectoryType.Ldap)
        .mockResolvedValue(getLdapConfiguration());
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          users: true,
          groups: true,
        }),
      );

      cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
      // This arranges the last hash to be differet from the ArrayBuffer after it is converted to b64
      stateService.getLastSyncHash.mockResolvedValue("unique hash");

      const syncResult = await syncService.sync(false, false);
      const result = await directoryService.getEntries(true, true);

      expect(syncResult).toEqual([groupFixtures, userFixtures]);
      expect(result).toEqual([groupFixtures, userFixtures]);
      expect(result).toEqual(syncResult);

      expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(1);
    });

    it("with largeImport enabled matches directory fixture data", async () => {
      stateService.getDirectory
        .calledWith(DirectoryType.Ldap)
        .mockResolvedValue(getLdapConfiguration());
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          users: true,
          groups: true,
          largeImport: true,
          overwriteExisting: false,
        }),
      );

      cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
      // This arranges the last hash to be differet from the ArrayBuffer after it is converted to b64
      stateService.getLastSyncHash.mockResolvedValue("unique hash");

      // @ts-expect-error This is a workaround to make the batchsize smaller to trigger the batching logic since its a const.
      constants.batchSize = 4;

      const result = await directoryService.getEntries(true, true);
      const syncResult = await syncService.sync(false, false);

      expect(syncResult).toEqual([groupFixtures, userFixtures]);
      expect(result).toEqual([groupFixtures, userFixtures]);
      expect(result).toEqual(syncResult);
      expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(6);
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
