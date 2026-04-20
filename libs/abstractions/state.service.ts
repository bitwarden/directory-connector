import { DirectoryType } from "@/libs/enums/directoryType";
import { EnvironmentUrls } from "@/libs/models/domain/environmentUrls";
import { EntraIdConfiguration } from "@/libs/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/libs/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/libs/models/ldapConfiguration";
import { OktaConfiguration } from "@/libs/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/libs/models/oneLoginConfiguration";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

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
  abstract getLdapConfiguration(): Promise<LdapConfiguration>;
  abstract setLdapConfiguration(value: LdapConfiguration): Promise<void>;
  abstract getGsuiteConfiguration(): Promise<GSuiteConfiguration>;
  abstract setGsuiteConfiguration(value: GSuiteConfiguration): Promise<void>;
  abstract getEntraConfiguration(): Promise<EntraIdConfiguration>;
  abstract setEntraConfiguration(value: EntraIdConfiguration): Promise<void>;
  abstract getOktaConfiguration(): Promise<OktaConfiguration>;
  abstract setOktaConfiguration(value: OktaConfiguration): Promise<void>;
  abstract getOneLoginConfiguration(): Promise<OneLoginConfiguration>;
  abstract setOneLoginConfiguration(value: OneLoginConfiguration): Promise<void>;
  abstract getOrganizationId(): Promise<string>;
  abstract setOrganizationId(value: string): Promise<void>;
  abstract getSync(): Promise<SyncConfiguration>;
  abstract setSync(value: SyncConfiguration): Promise<void>;
  abstract getDirectoryType(): Promise<DirectoryType>;
  abstract setDirectoryType(value: DirectoryType): Promise<void>;
  abstract getUserDelta(): Promise<string>;
  abstract setUserDelta(value: string): Promise<void>;
  abstract getLastUserSync(): Promise<Date>;
  abstract setLastUserSync(value: Date): Promise<void>;
  abstract getLastGroupSync(): Promise<Date>;
  abstract setLastGroupSync(value: Date): Promise<void>;
  abstract getGroupDelta(): Promise<string>;
  abstract setGroupDelta(value: string): Promise<void>;
  abstract getLastSyncHash(): Promise<string>;
  abstract setLastSyncHash(value: string): Promise<void>;
  abstract getSyncingDir(): Promise<boolean>;
  abstract setSyncingDir(value: boolean): Promise<void>;
  abstract clearSyncSettings(syncHashToo: boolean): Promise<void>;

  // Window settings (for WindowMain)
  abstract getWindow(): Promise<any>;
  abstract setWindow(value: any): Promise<void>;
  abstract getEnableAlwaysOnTop(): Promise<boolean>;
  abstract setEnableAlwaysOnTop(value: boolean): Promise<void>;

  // Tray settings (for TrayMain)
  abstract getEnableTray(): Promise<boolean>;
  abstract setEnableTray(value: boolean): Promise<void>;
  abstract getEnableMinimizeToTray(): Promise<boolean>;
  abstract setEnableMinimizeToTray(value: boolean): Promise<void>;
  abstract getEnableCloseToTray(): Promise<boolean>;
  abstract setEnableCloseToTray(value: boolean): Promise<void>;
  abstract getAlwaysShowDock(): Promise<boolean>;
  abstract setAlwaysShowDock(value: boolean): Promise<void>;

  // Environment URLs (adding convenience methods)
  abstract getEnvironmentUrls(): Promise<EnvironmentUrls>;
  abstract setEnvironmentUrls(value: EnvironmentUrls): Promise<void>;
  abstract getApiUrl(): Promise<string>;
  abstract getIdentityUrl(): Promise<string>;

  // Token management (replaces TokenService.clearToken())
  abstract clearAuthTokens(): Promise<void>;
  abstract getAccessToken(): Promise<string>;
  abstract setAccessToken(value: string): Promise<void>;
  abstract getRefreshToken(): Promise<string>;
  abstract setRefreshToken(value: string): Promise<void>;
  abstract getApiKeyClientId(): Promise<string>;
  abstract setApiKeyClientId(value: string): Promise<void>;
  abstract getApiKeyClientSecret(): Promise<string>;
  abstract setApiKeyClientSecret(value: string): Promise<void>;

  // Lifecycle methods
  abstract init(): Promise<void>;

  // Additional state methods
  abstract getLocale(): Promise<string>;
  abstract setLocale(value: string): Promise<void>;
  abstract getInstalledVersion(): Promise<string>;
  abstract setInstalledVersion(value: string): Promise<void>;
  abstract getIsAuthenticated(): Promise<boolean>;
  abstract getEntityId(): Promise<string>;
  abstract setEntityId(value: string): Promise<void>;
}
