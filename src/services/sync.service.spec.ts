import { mock, MockProxy } from "jest-mock-extended";

import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";
import { ApiService } from "@/jslib/common/src/services/api.service";

import { getSyncConfiguration } from "../../utils/openldap/config-fixtures";
import { DirectoryFactoryService } from "../abstractions/directory-factory.service";
import { StateServiceVNext } from "../abstractions/state-vNext.service";
import { DirectoryType } from "../enums/directoryType";

import { BatchRequestBuilder } from "./batch-request-builder";
import { LdapDirectoryService } from "./directory-services/ldap-directory.service";
import { I18nService } from "./i18n.service";
import { SingleRequestBuilder } from "./single-request-builder";
import { StateService } from "./state-service/state.service";
import { SyncService } from "./sync.service";
import * as constants from "./sync.service";

import { groupFixtures } from "@/utils/openldap/group-fixtures";
import { userFixtures } from "@/utils/openldap/user-fixtures";

describe("SyncService", () => {
  let cryptoFunctionService: MockProxy<CryptoFunctionService>;
  let apiService: MockProxy<ApiService>;
  let messagingService: MockProxy<MessagingService>;
  let i18nService: MockProxy<I18nService>;
  let stateServiceVNext: MockProxy<StateServiceVNext>;
  let stateService: MockProxy<StateService>;
  let directoryFactory: MockProxy<DirectoryFactoryService>;
  let batchRequestBuilder: MockProxy<BatchRequestBuilder>;
  let singleRequestBuilder: MockProxy<SingleRequestBuilder>;

  let syncService: SyncService;

  const originalBatchSize = constants.batchSize;

  beforeEach(() => {
    cryptoFunctionService = mock();
    apiService = mock();
    messagingService = mock();
    i18nService = mock();
    stateServiceVNext = mock();
    stateService = mock();
    directoryFactory = mock();
    batchRequestBuilder = mock();
    singleRequestBuilder = mock();

    stateServiceVNext.getApiUrl.mockResolvedValue("https://api.bitwarden.com");
    stateService.getDirectoryType.mockResolvedValue(DirectoryType.Ldap);
    stateService.getOrganizationId.mockResolvedValue("fakeId");
    const mockDirectoryService = mock<LdapDirectoryService>();
    mockDirectoryService.getEntries.mockResolvedValue([groupFixtures, userFixtures]);
    directoryFactory.createService.mockReturnValue(mockDirectoryService);

    syncService = new SyncService(
      cryptoFunctionService,
      apiService,
      messagingService,
      i18nService,
      stateServiceVNext,
      stateService,
      batchRequestBuilder,
      singleRequestBuilder,
      directoryFactory,
    );
  });

  it("Sync posts single request successfully for unique hashes", async () => {
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
    stateService.getSync.mockResolvedValue(
      getSyncConfiguration({ groups: true, users: true, largeImport: true }),
    );
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
    // This arranges the last hash to be differet from the ArrayBuffer after it is converted to b64
    stateService.getLastSyncHash.mockResolvedValue("unique hash");

    // @ts-expect-error This is a workaround to make the batchsize smaller to trigger the batching logic since its a const.
    // eslint-disable-next-line no-import-assign
    constants.batchSize = 4;

    const mockRequests = new Array(6).fill({
      members: [],
      groups: [],
      overwriteExisting: true,
      largeImport: true,
    });

    batchRequestBuilder.buildRequest.mockReturnValue(mockRequests);

    await syncService.sync(true, false);

    expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(6);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[0]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[1]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[2]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[3]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[4]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[5]);

    // @ts-expect-error Reset batch size back to original value.
    // eslint-disable-next-line no-import-assign
    constants.batchSize = originalBatchSize;
  });

  it("does not post for the same hash", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
    // This arranges the last hash to be the same as the ArrayBuffer after it is converted to b64
    stateService.getLastSyncHash.mockResolvedValue("AA==");

    await syncService.sync(true, false);

    expect(apiService.postPublicImportDirectory).not.toHaveBeenCalled();
  });
});
