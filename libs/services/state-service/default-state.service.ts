import { LogService } from "@/libs/abstractions/log.service";
import { StorageService } from "@/libs/abstractions/storage.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { IConfiguration } from "@/libs/models/IConfiguration";
import { EnvironmentUrls } from "@/libs/models/domain/environmentUrls";
import { EntraIdConfiguration } from "@/libs/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/libs/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/libs/models/ldapConfiguration";
import { OktaConfiguration } from "@/libs/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/libs/models/oneLoginConfiguration";
import { SecureStorageKeys, StorageKeys, StoredSecurely } from "@/libs/models/state.model";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

import { StateService } from "./default-state.service";
import { StateMigrationService } from "./stateMigration.service";

export class DefaultStateService implements StateService {
  constructor(
    protected storageService: StorageService,
    protected secureStorageService: StorageService,
    protected logService: LogService,
    protected stateMigrationService: StateMigrationService,
    protected useSecureStorageForSecrets = true,
  ) {}

  async init(): Promise<void> {
    if (await this.stateMigrationService.needsMigration()) {
      await this.stateMigrationService.migrate();
    }
  }

  // ===================================================================
  // Directory Configuration Methods
  // ===================================================================

  async getDirectory<T extends IConfiguration>(type: DirectoryType): Promise<T> {
    const config = await this.getConfiguration(type);
    if (config == null) {
      return config as T;
    }

    if (this.useSecureStorageForSecrets) {
      // Do not introduce secrets into the in-memory account object
      const configWithSecrets = Object.assign({}, config);

      switch (type) {
        case DirectoryType.Ldap:
          (configWithSecrets as any).password = await this.getLdapSecret();
          break;
        case DirectoryType.EntraID:
          (configWithSecrets as any).key = await this.getEntraSecret();
          break;
        case DirectoryType.Okta:
          (configWithSecrets as any).token = await this.getOktaSecret();
          break;
        case DirectoryType.GSuite:
          (configWithSecrets as any).privateKey = await this.getGsuiteSecret();
          break;
        case DirectoryType.OneLogin:
          (configWithSecrets as any).clientSecret = await this.getOneLoginSecret();
          break;
      }

      return configWithSecrets as T;
    }

    return config as T;
  }

  async setDirectory(
    type: DirectoryType,
    config:
      | LdapConfiguration
      | GSuiteConfiguration
      | EntraIdConfiguration
      | OktaConfiguration
      | OneLoginConfiguration,
  ): Promise<any> {
    if (this.useSecureStorageForSecrets) {
      switch (type) {
        case DirectoryType.Ldap: {
          const ldapConfig = config as LdapConfiguration;
          await this.setLdapSecret(ldapConfig.password);
          ldapConfig.password = StoredSecurely;
          await this.setLdapConfiguration(ldapConfig);
          break;
        }
        case DirectoryType.EntraID: {
          const entraConfig = config as EntraIdConfiguration;
          await this.setEntraSecret(entraConfig.key);
          entraConfig.key = StoredSecurely;
          await this.setEntraConfiguration(entraConfig);
          break;
        }
        case DirectoryType.Okta: {
          const oktaConfig = config as OktaConfiguration;
          await this.setOktaSecret(oktaConfig.token);
          oktaConfig.token = StoredSecurely;
          await this.setOktaConfiguration(oktaConfig);
          break;
        }
        case DirectoryType.GSuite: {
          const gsuiteConfig = config as GSuiteConfiguration;
          if (gsuiteConfig.privateKey == null) {
            await this.setGsuiteSecret(null);
          } else {
            const normalizedPrivateKey = gsuiteConfig.privateKey.replace(/\\n/g, "\n");
            await this.setGsuiteSecret(normalizedPrivateKey);
            gsuiteConfig.privateKey = StoredSecurely;
          }
          await this.setGsuiteConfiguration(gsuiteConfig);
          break;
        }
        case DirectoryType.OneLogin: {
          const oneLoginConfig = config as OneLoginConfiguration;
          await this.setOneLoginSecret(oneLoginConfig.clientSecret);
          oneLoginConfig.clientSecret = StoredSecurely;
          await this.setOneLoginConfiguration(oneLoginConfig);
          break;
        }
      }
    } else {
      switch (type) {
        case DirectoryType.Ldap:
          await this.setLdapConfiguration(config as LdapConfiguration);
          break;
        case DirectoryType.EntraID:
          await this.setEntraConfiguration(config as EntraIdConfiguration);
          break;
        case DirectoryType.Okta:
          await this.setOktaConfiguration(config as OktaConfiguration);
          break;
        case DirectoryType.GSuite:
          await this.setGsuiteConfiguration(config as GSuiteConfiguration);
          break;
        case DirectoryType.OneLogin:
          await this.setOneLoginConfiguration(config as OneLoginConfiguration);
          break;
      }
    }
  }

  async getConfiguration(type: DirectoryType): Promise<IConfiguration> {
    switch (type) {
      case DirectoryType.Ldap:
        return await this.getLdapConfiguration();
      case DirectoryType.GSuite:
        return await this.getGsuiteConfiguration();
      case DirectoryType.EntraID:
        return await this.getEntraConfiguration();
      case DirectoryType.Okta:
        return await this.getOktaConfiguration();
      case DirectoryType.OneLogin:
        return await this.getOneLoginConfiguration();
    }
  }

  // ===================================================================
  // Secret Storage Methods (Secure Storage)
  // ===================================================================

  private async getLdapSecret(): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.ldap);
  }

  private async setLdapSecret(value: string): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.ldap);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.ldap, value);
    }
  }

  private async getGsuiteSecret(): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.gsuite);
  }

  private async setGsuiteSecret(value: string): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.gsuite);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.gsuite, value);
    }
  }

  private async getEntraSecret(): Promise<string> {
    // Try new key first, fall back to old azure key for backwards compatibility
    const entraKey = await this.secureStorageService.get<string>(SecureStorageKeys.entra);
    if (entraKey != null) {
      return entraKey;
    }
    return await this.secureStorageService.get<string>(SecureStorageKeys.azure);
  }

  private async setEntraSecret(value: string): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.entra);
      await this.secureStorageService.remove(SecureStorageKeys.azure);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.entra, value);
    }
  }

  private async getOktaSecret(): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.okta);
  }

  private async setOktaSecret(value: string): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.okta);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.okta, value);
    }
  }

  private async getOneLoginSecret(): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.oneLogin);
  }

  private async setOneLoginSecret(value: string): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.oneLogin);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.oneLogin, value);
    }
  }

  // ===================================================================
  // Directory-Specific Configuration Methods
  // ===================================================================

  async getLdapConfiguration(): Promise<LdapConfiguration> {
    return await this.storageService.get<LdapConfiguration>(StorageKeys.directoryLdap);
  }

  async setLdapConfiguration(value: LdapConfiguration): Promise<void> {
    await this.storageService.save(StorageKeys.directoryLdap, value);
  }

  async getGsuiteConfiguration(): Promise<GSuiteConfiguration> {
    return await this.storageService.get<GSuiteConfiguration>(StorageKeys.directoryGsuite);
  }

  async setGsuiteConfiguration(value: GSuiteConfiguration): Promise<void> {
    await this.storageService.save(StorageKeys.directoryGsuite, value);
  }

  async getEntraConfiguration(): Promise<EntraIdConfiguration> {
    return await this.storageService.get<EntraIdConfiguration>(StorageKeys.directoryEntra);
  }

  async setEntraConfiguration(value: EntraIdConfiguration): Promise<void> {
    await this.storageService.save(StorageKeys.directoryEntra, value);
  }

  async getOktaConfiguration(): Promise<OktaConfiguration> {
    return await this.storageService.get<OktaConfiguration>(StorageKeys.directoryOkta);
  }

  async setOktaConfiguration(value: OktaConfiguration): Promise<void> {
    await this.storageService.save(StorageKeys.directoryOkta, value);
  }

  async getOneLoginConfiguration(): Promise<OneLoginConfiguration> {
    return await this.storageService.get<OneLoginConfiguration>(StorageKeys.directoryOnelogin);
  }

  async setOneLoginConfiguration(value: OneLoginConfiguration): Promise<void> {
    await this.storageService.save(StorageKeys.directoryOnelogin, value);
  }

  // ===================================================================
  // Directory Settings Methods
  // ===================================================================

  async getOrganizationId(): Promise<string> {
    return await this.storageService.get<string>(StorageKeys.organizationId);
  }

  async setOrganizationId(value: string): Promise<void> {
    const currentId = await this.getOrganizationId();
    if (currentId !== value) {
      await this.clearSyncSettings();
    }
    await this.storageService.save(StorageKeys.organizationId, value);
  }

  async getSync(): Promise<SyncConfiguration> {
    return await this.storageService.get<SyncConfiguration>(StorageKeys.sync);
  }

  async setSync(value: SyncConfiguration): Promise<void> {
    await this.storageService.save(StorageKeys.sync, value);
  }

  async getDirectoryType(): Promise<DirectoryType> {
    return await this.storageService.get<DirectoryType>(StorageKeys.directoryType);
  }

  async setDirectoryType(value: DirectoryType): Promise<void> {
    const currentType = await this.getDirectoryType();
    if (value !== currentType) {
      await this.clearSyncSettings();
    }
    await this.storageService.save(StorageKeys.directoryType, value);
  }

  async getLastUserSync(): Promise<Date> {
    const dateString = await this.storageService.get<string>(StorageKeys.lastUserSync);
    return dateString ? new Date(dateString) : null;
  }

  async setLastUserSync(value: Date): Promise<void> {
    await this.storageService.save(StorageKeys.lastUserSync, value);
  }

  async getLastGroupSync(): Promise<Date> {
    const dateString = await this.storageService.get<string>(StorageKeys.lastGroupSync);
    return dateString ? new Date(dateString) : null;
  }

  async setLastGroupSync(value: Date): Promise<void> {
    await this.storageService.save(StorageKeys.lastGroupSync, value);
  }

  async getLastSyncHash(): Promise<string> {
    return await this.storageService.get<string>(StorageKeys.lastSyncHash);
  }

  async setLastSyncHash(value: string): Promise<void> {
    await this.storageService.save(StorageKeys.lastSyncHash, value);
  }

  async getSyncingDir(): Promise<boolean> {
    return await this.storageService.get<boolean>(StorageKeys.syncingDir);
  }

  async setSyncingDir(value: boolean): Promise<void> {
    await this.storageService.save(StorageKeys.syncingDir, value);
  }

  async getUserDelta(): Promise<string> {
    return await this.storageService.get<string>(StorageKeys.userDelta);
  }

  async setUserDelta(value: string): Promise<void> {
    await this.storageService.save(StorageKeys.userDelta, value);
  }

  async getGroupDelta(): Promise<string> {
    return await this.storageService.get<string>(StorageKeys.groupDelta);
  }

  async setGroupDelta(value: string): Promise<void> {
    await this.storageService.save(StorageKeys.groupDelta, value);
  }

  async clearSyncSettings(hashToo = false): Promise<void> {
    await this.setUserDelta(null);
    await this.setGroupDelta(null);
    await this.setLastGroupSync(null);
    await this.setLastUserSync(null);
    if (hashToo) {
      await this.setLastSyncHash(null);
    }
  }

  // ===================================================================
  // Environment URLs
  // ===================================================================

  async getEnvironmentUrls(): Promise<EnvironmentUrls> {
    return await this.storageService.get<EnvironmentUrls>(StorageKeys.environmentUrls);
  }

  async setEnvironmentUrls(value: EnvironmentUrls): Promise<void> {
    await this.storageService.save(StorageKeys.environmentUrls, value);
  }

  async getApiUrl(): Promise<string> {
    const urls = await this.getEnvironmentUrls();
    if (urls?.api) {
      return urls.api;
    }
    if (urls?.base) {
      return urls.base + "/api";
    }
    return "https://api.bitwarden.com";
  }

  async getIdentityUrl(): Promise<string> {
    const urls = await this.getEnvironmentUrls();
    if (urls?.identity) {
      return urls.identity;
    }
    if (urls?.base) {
      return urls.base + "/identity";
    }
    return "https://identity.bitwarden.com";
  }

  // ===================================================================
  // Additional State Methods
  // ===================================================================

  async getLocale(): Promise<string> {
    return await this.storageService.get<string>(StorageKeys.locale);
  }

  async setLocale(value: string): Promise<void> {
    await this.storageService.save(StorageKeys.locale, value);
  }

  async getInstalledVersion(): Promise<string> {
    return await this.storageService.get<string>(StorageKeys.installedVersion);
  }

  async setInstalledVersion(value: string): Promise<void> {
    await this.storageService.save(StorageKeys.installedVersion, value);
  }

  // ===================================================================
  // Window Settings (for WindowMain)
  // ===================================================================

  async getWindow(): Promise<any> {
    return await this.storageService.get(StorageKeys.window);
  }

  async setWindow(value: any): Promise<void> {
    await this.storageService.save(StorageKeys.window, value);
  }

  async getEnableAlwaysOnTop(): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.enableAlwaysOnTop)) ?? false;
  }

  async setEnableAlwaysOnTop(value: boolean): Promise<void> {
    await this.storageService.save(StorageKeys.enableAlwaysOnTop, value);
  }

  // ===================================================================
  // Tray Settings (for TrayMain)
  // ===================================================================

  async getEnableTray(): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.enableTray)) ?? false;
  }

  async setEnableTray(value: boolean): Promise<void> {
    await this.storageService.save(StorageKeys.enableTray, value);
  }

  async getEnableMinimizeToTray(): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.enableMinimizeToTray)) ?? false;
  }

  async setEnableMinimizeToTray(value: boolean): Promise<void> {
    await this.storageService.save(StorageKeys.enableMinimizeToTray, value);
  }

  async getEnableCloseToTray(): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.enableCloseToTray)) ?? false;
  }

  async setEnableCloseToTray(value: boolean): Promise<void> {
    await this.storageService.save(StorageKeys.enableCloseToTray, value);
  }

  async getAlwaysShowDock(): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.alwaysShowDock)) ?? false;
  }

  async setAlwaysShowDock(value: boolean): Promise<void> {
    await this.storageService.save(StorageKeys.alwaysShowDock, value);
  }

  async clearAuthTokens(): Promise<void> {
    await this.secureStorageService.remove(SecureStorageKeys.accessToken);
    await this.secureStorageService.remove(SecureStorageKeys.refreshToken);
    await this.secureStorageService.remove(SecureStorageKeys.apiKeyClientId);
    await this.secureStorageService.remove(SecureStorageKeys.apiKeyClientSecret);
    await this.secureStorageService.remove(SecureStorageKeys.twoFactorToken);
  }

  async getAccessToken(): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.accessToken);
  }

  async setAccessToken(value: string): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.accessToken);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.accessToken, value);
    }
  }

  async getRefreshToken(): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.refreshToken);
  }

  async setRefreshToken(value: string): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.refreshToken);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.refreshToken, value);
    }
  }

  async getApiKeyClientId(): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.apiKeyClientId);
  }

  async setApiKeyClientId(value: string): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.apiKeyClientId);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.apiKeyClientId, value);
    }
  }

  async getApiKeyClientSecret(): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.apiKeyClientSecret);
  }

  async setApiKeyClientSecret(value: string): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.apiKeyClientSecret);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.apiKeyClientSecret, value);
    }
  }

  async getIsAuthenticated(): Promise<boolean> {
    // Check if access token exists
    const token = await this.getAccessToken();
    return token != null;
  }

  async getEntityId(): Promise<string> {
    return await this.storageService.get<string>(StorageKeys.entityId);
  }

  async setEntityId(value: string): Promise<void> {
    if (value == null) {
      await this.storageService.remove(StorageKeys.entityId);
    } else {
      await this.storageService.save(StorageKeys.entityId, value);
    }
  }
}

// Re-export the abstraction for convenience
export { StateService } from "@/libs/abstractions/state.service";
export { DefaultStateService as StateServiceImplementation };
