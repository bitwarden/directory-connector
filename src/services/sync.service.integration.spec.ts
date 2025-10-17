import { mock, MockProxy } from "jest-mock-extended";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { EnvironmentService } from "@/jslib/common/src/services/environment.service";

import { I18nService } from "../../jslib/common/src/abstractions/i18n.service";
import { LogService } from "../../jslib/common/src/abstractions/log.service";
import { getLdapConfiguration, getSyncConfiguration } from "../../utils/openldap/config-fixtures";
import { DirectoryFactoryService } from "../abstractions/directory-factory.service";
import { DirectoryType } from "../enums/directoryType";

import { BatchRequestBuilder } from "./batch-request-builder";
import { LdapDirectoryService } from "./ldap-directory.service";
import { SingleRequestBuilder } from "./single-request-builder";
import { StateService } from "./state.service";
import { SyncService } from "./sync.service";
import * as constants from "./sync.service";

import { groupFixtures } from "@/utils/openldap/group-fixtures";
import { userFixtures } from "@/utils/openldap/user-fixtures";

describe("SyncService", () => {
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

  const originalBatchSize = constants.batchSize;

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

  describe("OpenLdap integration: ", () => {
    it("with largeImport disabled matches directory fixture data", async () => {
      stateService.getDirectory
        .calledWith(DirectoryType.Ldap)
        .mockResolvedValue(getLdapConfiguration());
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          users: true,
          groups: true,
          largeImport: false,
          overwriteExisting: false,
        }),
      );

      cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
      // This arranges the last hash to be differet from the ArrayBuffer after it is converted to b64
      stateService.getLastSyncHash.mockResolvedValue("unique hash");

      const syncResult = await syncService.sync(false, false);

      expect(syncResult).toEqual([groupFixtures, userFixtures]);

      expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(
        expect.objectContaining({ overwriteExisting: false }),
      );
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

      const syncResult = await syncService.sync(false, false);

      expect(syncResult).toEqual([groupFixtures, userFixtures]);
      expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(
        expect.objectContaining({ overwriteExisting: false }),
      );

      // The expected number of calls may change if more data is added to the ldif
      // Make sure it equals (number of users / 4) + (number of groups / 4)
      expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(7);

      // @ts-expect-error Reset batch size to original state.
      constants.batchSize = originalBatchSize;
    });
  });
});
