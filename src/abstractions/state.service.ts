import { EnvironmentUrls } from "@/jslib/common/src/models/domain/environmentUrls";
import { StorageOptions } from "@/jslib/common/src/models/domain/storageOptions";

import { DirectoryType } from "@/src/enums/directoryType";
import { EntraIdConfiguration } from "@/src/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/src/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/src/models/ldapConfiguration";
import { OktaConfiguration } from "@/src/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/src/models/oneLoginConfiguration";
import { SyncConfiguration } from "@/src/models/syncConfiguration";

export abstract class StateService {
  abstract getDirectory<IConfiguration>(type: DirectoryType): Promise<IConfiguration>;
  abstract setDirectory(
    type: DirectoryType,
    config:
      | LdapConfiguration
      | GSuiteConfiguration
      | EntraIdConfiguration
      | OktaConfiguration
      | OneLoginConfiguration,
  ): Promise<any>;
  abstract getLdapConfiguration(options?: StorageOptions): Promise<LdapConfiguration>;
  abstract setLdapConfiguration(value: LdapConfiguration, options?: StorageOptions): Promise<void>;
  abstract getGsuiteConfiguration(options?: StorageOptions): Promise<GSuiteConfiguration>;
  abstract setGsuiteConfiguration(
    value: GSuiteConfiguration,
    options?: StorageOptions,
  ): Promise<void>;
  abstract getEntraConfiguration(options?: StorageOptions): Promise<EntraIdConfiguration>;
  abstract setEntraConfiguration(
    value: EntraIdConfiguration,
    options?: StorageOptions,
  ): Promise<void>;
  abstract getOktaConfiguration(options?: StorageOptions): Promise<OktaConfiguration>;
  abstract setOktaConfiguration(value: OktaConfiguration, options?: StorageOptions): Promise<void>;
  abstract getOneLoginConfiguration(options?: StorageOptions): Promise<OneLoginConfiguration>;
  abstract setOneLoginConfiguration(
    value: OneLoginConfiguration,
    options?: StorageOptions,
  ): Promise<void>;
  abstract getOrganizationId(options?: StorageOptions): Promise<string>;
  abstract setOrganizationId(value: string, options?: StorageOptions): Promise<void>;
  abstract getSync(options?: StorageOptions): Promise<SyncConfiguration>;
  abstract setSync(value: SyncConfiguration, options?: StorageOptions): Promise<void>;
  abstract getDirectoryType(options?: StorageOptions): Promise<DirectoryType>;
  abstract setDirectoryType(value: DirectoryType, options?: StorageOptions): Promise<void>;
  abstract getUserDelta(options?: StorageOptions): Promise<string>;
  abstract setUserDelta(value: string, options?: StorageOptions): Promise<void>;
  abstract getLastUserSync(options?: StorageOptions): Promise<Date>;
  abstract setLastUserSync(value: Date, options?: StorageOptions): Promise<void>;
  abstract getLastGroupSync(options?: StorageOptions): Promise<Date>;
  abstract setLastGroupSync(value: Date, options?: StorageOptions): Promise<void>;
  abstract getGroupDelta(options?: StorageOptions): Promise<string>;
  abstract setGroupDelta(value: string, options?: StorageOptions): Promise<void>;
  abstract getLastSyncHash(options?: StorageOptions): Promise<string>;
  abstract setLastSyncHash(value: string, options?: StorageOptions): Promise<void>;
  abstract getSyncingDir(options?: StorageOptions): Promise<boolean>;
  abstract setSyncingDir(value: boolean, options?: StorageOptions): Promise<void>;
  abstract clearSyncSettings(syncHashToo: boolean): Promise<void>;

  // Window settings (for WindowMain)
  abstract getWindow(options?: StorageOptions): Promise<any>;
  abstract setWindow(value: any, options?: StorageOptions): Promise<void>;
  abstract getEnableAlwaysOnTop(options?: StorageOptions): Promise<boolean>;
  abstract setEnableAlwaysOnTop(value: boolean, options?: StorageOptions): Promise<void>;

  // Tray settings (for TrayMain)
  abstract getEnableTray(options?: StorageOptions): Promise<boolean>;
  abstract setEnableTray(value: boolean, options?: StorageOptions): Promise<void>;
  abstract getEnableMinimizeToTray(options?: StorageOptions): Promise<boolean>;
  abstract setEnableMinimizeToTray(value: boolean, options?: StorageOptions): Promise<void>;
  abstract getEnableCloseToTray(options?: StorageOptions): Promise<boolean>;
  abstract setEnableCloseToTray(value: boolean, options?: StorageOptions): Promise<void>;
  abstract getAlwaysShowDock(options?: StorageOptions): Promise<boolean>;
  abstract setAlwaysShowDock(value: boolean, options?: StorageOptions): Promise<void>;

  // Environment URLs (adding convenience methods)
  abstract getEnvironmentUrls(options?: StorageOptions): Promise<EnvironmentUrls>;
  abstract setEnvironmentUrls(value: EnvironmentUrls): Promise<void>;
  abstract getApiUrl(options?: StorageOptions): Promise<string>;
  abstract getIdentityUrl(options?: StorageOptions): Promise<string>;

  // Token management (replaces TokenService.clearToken())
  abstract clearAuthTokens(): Promise<void>;
  abstract getAccessToken(options?: StorageOptions): Promise<string>;
  abstract setAccessToken(value: string, options?: StorageOptions): Promise<void>;
  abstract getRefreshToken(options?: StorageOptions): Promise<string>;
  abstract setRefreshToken(value: string, options?: StorageOptions): Promise<void>;
  abstract getApiKeyClientId(options?: StorageOptions): Promise<string>;
  abstract setApiKeyClientId(value: string, options?: StorageOptions): Promise<void>;
  abstract getApiKeyClientSecret(options?: StorageOptions): Promise<string>;
  abstract setApiKeyClientSecret(value: string, options?: StorageOptions): Promise<void>;

  // Lifecycle methods
  abstract init(): Promise<void>;
  abstract clean(options?: StorageOptions): Promise<void>;

  // Additional state methods
  abstract getLocale(options?: StorageOptions): Promise<string>;
  abstract setLocale(value: string, options?: StorageOptions): Promise<void>;
  abstract getInstalledVersion(options?: StorageOptions): Promise<string>;
  abstract setInstalledVersion(value: string, options?: StorageOptions): Promise<void>;
  abstract getIsAuthenticated(options?: StorageOptions): Promise<boolean>;
  abstract getEntityId(options?: StorageOptions): Promise<string>;
  abstract setEntityId(value: string, options?: StorageOptions): Promise<void>;
}
