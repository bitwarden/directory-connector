import { mock, MockProxy } from "jest-mock-extended";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { DirectoryFactoryService } from "../abstractions/directory-factory.service";
import { DirectoryType } from "../enums/directoryType";
import {
  getLargeSyncConfiguration,
  getLdapConfiguration,
  getSyncConfiguration,
} from "../utils/test-fixtures";

import { BatchRequestBuilder } from "./batch-request-builder";
import { I18nService } from "./i18n.service";
import { LdapDirectoryService } from "./ldap-directory.service";
import { SingleRequestBuilder } from "./single-request-builder";
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
  let directoryFactory: MockProxy<DirectoryFactoryService>;
  let batchRequestBuilder: MockProxy<BatchRequestBuilder>;
  let singleRequestBuilder: MockProxy<SingleRequestBuilder>;

  let syncService: MockProxy<SyncService>;

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

    syncService = mock(
      new SyncService(
        cryptoFunctionService,
        apiService,
        messagingService,
        i18nService,
        environmentService,
        stateService,
        batchRequestBuilder,
        singleRequestBuilder,
        directoryFactory,
      ),
    );
  });

  it("Sync posts single request successfully for unique hashes", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());

    stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
    // This arranges the last hash to be differet from the ArrayBuffer after it is converted to b64
    stateService.getLastSyncHash.mockResolvedValue("unique hash");

    const mockRequest: OrganizationImportRequest[] = [
      {
        members: [],
        groups: [],
        overwriteExisting: true,
        largeImport: true,
      },
    ];

    singleRequestBuilder.buildRequest.mockReturnValue(mockRequest);

    await syncService.sync(true, false);

    expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(1);
  });

  it("Sync posts multiple request successfully for unique hashes", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());

    stateService.getSync.mockResolvedValue(getLargeSyncConfiguration());
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
    // This arranges the last hash to be differet from the ArrayBuffer after it is converted to b64
    stateService.getLastSyncHash.mockResolvedValue("unique hash");

    const mockRequests = new Array(6).fill({
      members: [],
      groups: [],
      overwriteExisting: true,
      largeImport: true,
    });

    batchRequestBuilder.buildRequest.mockReturnValue(mockRequests);

    await syncService.sync(true, false);

    expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(6);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith({
      members: [],
      groups: [],
      overwriteExisting: true,
      largeImport: true,
    });
  });

  it("does not post for the same hash", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());

    stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));

    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
    // This arranges the last hash to be the same as the ArrayBuffer after it is converted to b64
    stateService.getLastSyncHash.mockResolvedValue("AA==");

    await syncService.sync(true, false);

    expect(apiService.postPublicImportDirectory).not.toHaveBeenCalled();
  });
});
