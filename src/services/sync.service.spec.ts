import { mock, MockProxy } from "jest-mock-extended";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { DirectoryFactoryAbstraction } from "@/jslib/common/src/abstractions/directory-factory.service";
import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";
import { BatchRequestBuilder } from "@/jslib/common/src/services/batch-requests.service";
import { SingleRequestBuilder } from "@/jslib/common/src/services/single-request.service";

import { group11k } from "../../openldap/group-fixtures-11000";
import { users11k } from "../../openldap/user-fixtures-11000";
import { DirectoryType } from "../enums/directoryType";
import { LdapConfiguration } from "../models/ldapConfiguration";
import { SyncConfiguration } from "../models/syncConfiguration";

import { I18nService } from "./i18n.service";
import { LdapDirectoryService } from "./ldap-directory.service";
import { StateService } from "./state.service";
import { SyncService } from "./sync.service";

describe("SyncService", () => {
  let logService: MockProxy<LogService>;
  let cryptoFunctionService: MockProxy<CryptoFunctionService>;
  let apiService: MockProxy<ApiService>;
  let messagingService: MockProxy<MessagingService>;
  let i18nService: MockProxy<I18nService>;
  let environmentService: MockProxy<EnvironmentService>;
  let stateService: MockProxy<StateService>;
  let directoryFactory: MockProxy<DirectoryFactoryAbstraction>;
  let batchRequestBuilder: MockProxy<BatchRequestBuilder>;
  let singleRequestBuilder: MockProxy<SingleRequestBuilder>;

  let syncService: SyncService;

  beforeEach(async () => {
    logService = mock();
    cryptoFunctionService = mock();
    apiService = mock();
    messagingService = mock();
    i18nService = mock();
    environmentService = mock();
    stateService = mock();
    directoryFactory = mock();
    batchRequestBuilder = mock();
    singleRequestBuilder = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.Ldap);
    stateService.getOrganizationId.mockResolvedValue("fakeId");
    directoryFactory.createService.mockReturnValue(
      new LdapDirectoryService(logService, i18nService, stateService),
    );

    syncService = new SyncService(
      logService,
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

  it("Sync posts single request successfully for unique hashes", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());

    stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));

    const mockRequest: OrganizationImportRequest[] = [
      {
        members: [],
        groups: [],
        overwriteExisting: true,
        largeImport: true,
      },
    ];

    singleRequestBuilder.buildRequest.mockReturnValue(mockRequest);

    const results = await syncService.sync(true, false);

    expect(results).toEqual([group11k, users11k]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(1);
  });

  it("Sync posts multiple request successfully for unique hashes", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());

    stateService.getSync.mockResolvedValue(getLargeSyncConfiguration());
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));

    const batchSize = 2000;
    const totalUsers = users11k.length;
    const mockRequests = [];

    for (let i = 0; i <= totalUsers; i += batchSize) {
      mockRequests.push({
        members: [],
        groups: [],
        overwriteExisting: true,
        largeImport: true,
      });
    }

    batchRequestBuilder.buildRequest.mockReturnValue(mockRequests);

    const result = await syncService.sync(true, false);

    // This test relies on having a config with 11k users created. The main thing we want to test here is that the
    // requests are separated into multiple REST requests.
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(
      Math.ceil(users11k.length / batchSize),
    );
    expect(result).toEqual([group11k, users11k]);
  });

  it("does not post for the same hash", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());

    stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(0));

    await syncService.sync(true, false);

    expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(0);
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

const getLargeSyncConfiguration = () => ({
  ...getSyncConfiguration({ groups: true, users: true }),
  largeImport: true,
});
