import { StateService as BaseStateServiceAbstraction } from "@/jslib/common/src/abstractions/state.service";
import { StorageOptions } from "@/jslib/common/src/models/domain/storageOptions";

import { DirectoryType } from "src/enums/directoryType";
import { Account } from "src/models/account";
import { AzureConfiguration } from "src/models/azureConfiguration";
import { GSuiteConfiguration } from "src/models/gsuiteConfiguration";
import { LdapConfiguration } from "src/models/ldapConfiguration";
import { OktaConfiguration } from "src/models/oktaConfiguration";
import { OneLoginConfiguration } from "src/models/oneLoginConfiguration";
import { SyncConfiguration } from "src/models/syncConfiguration";

export abstract class StateService extends BaseStateServiceAbstraction<Account> {
  getDirectory: <IConfiguration>(type: DirectoryType) => Promise<IConfiguration>;
  setDirectory: (
    type: DirectoryType,
    config:
      | LdapConfiguration
      | GSuiteConfiguration
      | AzureConfiguration
      | OktaConfiguration
      | OneLoginConfiguration
  ) => Promise<any>;
  getLdapConfiguration: (options?: StorageOptions) => Promise<LdapConfiguration>;
  setLdapConfiguration: (value: LdapConfiguration, options?: StorageOptions) => Promise<void>;
  getGsuiteConfiguration: (options?: StorageOptions) => Promise<GSuiteConfiguration>;
  setGsuiteConfiguration: (value: GSuiteConfiguration, options?: StorageOptions) => Promise<void>;
  getAzureConfiguration: (options?: StorageOptions) => Promise<AzureConfiguration>;
  setAzureConfiguration: (value: AzureConfiguration, options?: StorageOptions) => Promise<void>;
  getOktaConfiguration: (options?: StorageOptions) => Promise<OktaConfiguration>;
  setOktaConfiguration: (value: OktaConfiguration, options?: StorageOptions) => Promise<void>;
  getOneLoginConfiguration: (options?: StorageOptions) => Promise<OneLoginConfiguration>;
  setOneLoginConfiguration: (
    value: OneLoginConfiguration,
    options?: StorageOptions
  ) => Promise<void>;
  getOrganizationId: (options?: StorageOptions) => Promise<string>;
  setOrganizationId: (value: string, options?: StorageOptions) => Promise<void>;
  getSync: (options?: StorageOptions) => Promise<SyncConfiguration>;
  setSync: (value: SyncConfiguration, options?: StorageOptions) => Promise<void>;
  getDirectoryType: (options?: StorageOptions) => Promise<DirectoryType>;
  setDirectoryType: (value: DirectoryType, options?: StorageOptions) => Promise<void>;
  getUserDelta: (options?: StorageOptions) => Promise<string>;
  setUserDelta: (value: string, options?: StorageOptions) => Promise<void>;
  getLastUserSync: (options?: StorageOptions) => Promise<Date>;
  setLastUserSync: (value: Date, options?: StorageOptions) => Promise<void>;
  getLastGroupSync: (options?: StorageOptions) => Promise<Date>;
  setLastGroupSync: (value: Date, options?: StorageOptions) => Promise<void>;
  getGroupDelta: (options?: StorageOptions) => Promise<string>;
  setGroupDelta: (value: string, options?: StorageOptions) => Promise<void>;
  getLastSyncHash: (options?: StorageOptions) => Promise<string>;
  setLastSyncHash: (value: string, options?: StorageOptions) => Promise<void>;
  getSyncingDir: (options?: StorageOptions) => Promise<boolean>;
  setSyncingDir: (value: boolean, options?: StorageOptions) => Promise<void>;
  clearSyncSettings: (syncHashToo: boolean) => Promise<void>;
}
