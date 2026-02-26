import { StateService as StateServiceAbstraction } from "@/libs/abstractions/state.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { IConfiguration } from "@/libs/models/IConfiguration";
import { EntraIdConfiguration } from "@/libs/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/libs/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/libs/models/ldapConfiguration";
import { OktaConfiguration } from "@/libs/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/libs/models/oneLoginConfiguration";
import {
  SecureStorageKeysVNext as SecureStorageKeys,
  StorageKeysVNext as StorageKeys,
  StoredSecurely,
} from "@/libs/models/state.model";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { StorageService } from "@/jslib/common/src/abstractions/storage.service";
import { EnvironmentUrls } from "@/jslib/common/src/models/domain/environmentUrls";
import { StorageOptions } from "@/jslib/common/src/models/domain/storageOptions";

import { StateMigrationService } from "./stateMigration.service";

export class StateServiceImplementation implements StateServiceAbstraction {
  constructor(
    protected storageService: StorageService,
    protected secureStorageService: StorageService,
    protected logService: LogService,
    protected stateMigrationService: StateMigrationService,
    private useSecureStorageForSecrets = true,
  ) {}

  async init(): Promise<void> {
    if (await this.stateMigrationService.needsMigration()) {
      await this.stateMigrationService.migrate();
    }
  }

  async clean(options?: StorageOptions): Promise<void> {
    // Clear all directory settings and configurations
    // but preserve version and environment settings
    await this.setDirectoryType(null);
    await this.setOrganizationId(null);
    await this.setSync(null);
    await this.setLdapConfiguration(null);
    await this.setGsuiteConfiguration(null);
    await this.setEntraConfiguration(null);
    await this.setOktaConfiguration(null);
    await this.setOneLoginConfiguration(null);
    await this.clearSyncSettings(true);
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
      // Create a copy to avoid modifying the cached config
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

  async getLdapConfiguration(options?: StorageOptions): Promise<LdapConfiguration> {
    return await this.storageService.get<LdapConfiguration>(StorageKeys.directory_ldap);
  }

  async setLdapConfiguration(value: LdapConfiguration, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.directory_ldap, value);
  }

  async getGsuiteConfiguration(options?: StorageOptions): Promise<GSuiteConfiguration> {
    return await this.storageService.get<GSuiteConfiguration>(StorageKeys.directory_gsuite);
  }

  async setGsuiteConfiguration(
    value: GSuiteConfiguration,
    options?: StorageOptions,
  ): Promise<void> {
    await this.storageService.save(StorageKeys.directory_gsuite, value);
  }

  async getEntraConfiguration(options?: StorageOptions): Promise<EntraIdConfiguration> {
    return await this.storageService.get<EntraIdConfiguration>(StorageKeys.directory_entra);
  }

  async setEntraConfiguration(
    value: EntraIdConfiguration,
    options?: StorageOptions,
  ): Promise<void> {
    await this.storageService.save(StorageKeys.directory_entra, value);
  }

  async getOktaConfiguration(options?: StorageOptions): Promise<OktaConfiguration> {
    return await this.storageService.get<OktaConfiguration>(StorageKeys.directory_okta);
  }

  async setOktaConfiguration(value: OktaConfiguration, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.directory_okta, value);
  }

  async getOneLoginConfiguration(options?: StorageOptions): Promise<OneLoginConfiguration> {
    return await this.storageService.get<OneLoginConfiguration>(StorageKeys.directory_onelogin);
  }

  async setOneLoginConfiguration(
    value: OneLoginConfiguration,
    options?: StorageOptions,
  ): Promise<void> {
    await this.storageService.save(StorageKeys.directory_onelogin, value);
  }

  // ===================================================================
  // Directory Settings Methods
  // ===================================================================

  async getOrganizationId(options?: StorageOptions): Promise<string> {
    return await this.storageService.get<string>(StorageKeys.organizationId);
  }

  async setOrganizationId(value: string, options?: StorageOptions): Promise<void> {
    const currentId = await this.getOrganizationId();
    if (currentId !== value) {
      await this.clearSyncSettings();
    }
    await this.storageService.save(StorageKeys.organizationId, value);
  }

  async getSync(options?: StorageOptions): Promise<SyncConfiguration> {
    return await this.storageService.get<SyncConfiguration>(StorageKeys.sync);
  }

  async setSync(value: SyncConfiguration, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.sync, value);
  }

  async getDirectoryType(options?: StorageOptions): Promise<DirectoryType> {
    return await this.storageService.get<DirectoryType>(StorageKeys.directoryType);
  }

  async setDirectoryType(value: DirectoryType, options?: StorageOptions): Promise<void> {
    const currentType = await this.getDirectoryType();
    if (value !== currentType) {
      await this.clearSyncSettings();
    }
    await this.storageService.save(StorageKeys.directoryType, value);
  }

  async getLastUserSync(options?: StorageOptions): Promise<Date> {
    const dateString = await this.storageService.get<string>(SecureStorageKeys.lastUserSync);
    return dateString ? new Date(dateString) : null;
  }

  async setLastUserSync(value: Date, options?: StorageOptions): Promise<void> {
    await this.storageService.save(SecureStorageKeys.lastUserSync, value);
  }

  async getLastGroupSync(options?: StorageOptions): Promise<Date> {
    const dateString = await this.storageService.get<string>(SecureStorageKeys.lastGroupSync);
    return dateString ? new Date(dateString) : null;
  }

  async setLastGroupSync(value: Date, options?: StorageOptions): Promise<void> {
    await this.storageService.save(SecureStorageKeys.lastGroupSync, value);
  }

  async getLastSyncHash(options?: StorageOptions): Promise<string> {
    return await this.storageService.get<string>(SecureStorageKeys.lastSyncHash);
  }

  async setLastSyncHash(value: string, options?: StorageOptions): Promise<void> {
    await this.storageService.save(SecureStorageKeys.lastSyncHash, value);
  }

  async getSyncingDir(options?: StorageOptions): Promise<boolean> {
    return await this.storageService.get<boolean>(StorageKeys.syncingDir);
  }

  async setSyncingDir(value: boolean, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.syncingDir, value);
  }

  async getUserDelta(options?: StorageOptions): Promise<string> {
    return await this.storageService.get<string>(SecureStorageKeys.userDelta);
  }

  async setUserDelta(value: string, options?: StorageOptions): Promise<void> {
    await this.storageService.save(SecureStorageKeys.userDelta, value);
  }

  async getGroupDelta(options?: StorageOptions): Promise<string> {
    return await this.storageService.get<string>(SecureStorageKeys.groupDelta);
  }

  async setGroupDelta(value: string, options?: StorageOptions): Promise<void> {
    await this.storageService.save(SecureStorageKeys.groupDelta, value);
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

  async getEnvironmentUrls(options?: StorageOptions): Promise<EnvironmentUrls> {
    return await this.storageService.get<EnvironmentUrls>(StorageKeys.environmentUrls);
  }

  async setEnvironmentUrls(value: EnvironmentUrls): Promise<void> {
    await this.storageService.save(StorageKeys.environmentUrls, value);
  }

  async getApiUrl(options?: StorageOptions): Promise<string> {
    const urls = await this.getEnvironmentUrls(options);
    if (urls?.api) {
      return urls.api;
    }
    if (urls?.base) {
      return urls.base + "/api";
    }
    return "https://api.bitwarden.com";
  }

  async getIdentityUrl(options?: StorageOptions): Promise<string> {
    const urls = await this.getEnvironmentUrls(options);
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

  async getLocale(options?: StorageOptions): Promise<string> {
    return await this.storageService.get<string>("locale");
  }

  async setLocale(value: string, options?: StorageOptions): Promise<void> {
    await this.storageService.save("locale", value);
  }

  async getInstalledVersion(options?: StorageOptions): Promise<string> {
    return await this.storageService.get<string>("installedVersion");
  }

  async setInstalledVersion(value: string, options?: StorageOptions): Promise<void> {
    await this.storageService.save("installedVersion", value);
  }

  // ===================================================================
  // Window Settings (for WindowMain)
  // ===================================================================

  async getWindow(options?: StorageOptions): Promise<any> {
    return await this.storageService.get(StorageKeys.window);
  }

  async setWindow(value: any, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.window, value);
  }

  async getEnableAlwaysOnTop(options?: StorageOptions): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.enableAlwaysOnTop)) ?? false;
  }

  async setEnableAlwaysOnTop(value: boolean, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.enableAlwaysOnTop, value);
  }

  // ===================================================================
  // Tray Settings (for TrayMain)
  // ===================================================================

  async getEnableTray(options?: StorageOptions): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.enableTray)) ?? false;
  }

  async setEnableTray(value: boolean, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.enableTray, value);
  }

  async getEnableMinimizeToTray(options?: StorageOptions): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.enableMinimizeToTray)) ?? false;
  }

  async setEnableMinimizeToTray(value: boolean, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.enableMinimizeToTray, value);
  }

  async getEnableCloseToTray(options?: StorageOptions): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.enableCloseToTray)) ?? false;
  }

  async setEnableCloseToTray(value: boolean, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.enableCloseToTray, value);
  }

  async getAlwaysShowDock(options?: StorageOptions): Promise<boolean> {
    return (await this.storageService.get<boolean>(StorageKeys.alwaysShowDock)) ?? false;
  }

  async setAlwaysShowDock(value: boolean, options?: StorageOptions): Promise<void> {
    await this.storageService.save(StorageKeys.alwaysShowDock, value);
  }

  // ===================================================================
  // Token Management (replaces TokenService.clearToken())
  // ===================================================================

  async clearAuthTokens(): Promise<void> {
    await this.secureStorageService.remove(SecureStorageKeys.accessToken);
    await this.secureStorageService.remove(SecureStorageKeys.refreshToken);
    await this.secureStorageService.remove(SecureStorageKeys.apiKeyClientId);
    await this.secureStorageService.remove(SecureStorageKeys.apiKeyClientSecret);
    await this.secureStorageService.remove(SecureStorageKeys.twoFactorToken);
  }

  async getAccessToken(options?: StorageOptions): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.accessToken);
  }

  async setAccessToken(value: string, options?: StorageOptions): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.accessToken);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.accessToken, value);
    }
  }

  async getRefreshToken(options?: StorageOptions): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.refreshToken);
  }

  async setRefreshToken(value: string, options?: StorageOptions): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.refreshToken);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.refreshToken, value);
    }
  }

  async getApiKeyClientId(options?: StorageOptions): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.apiKeyClientId);
  }

  async setApiKeyClientId(value: string, options?: StorageOptions): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.apiKeyClientId);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.apiKeyClientId, value);
    }
  }

  async getApiKeyClientSecret(options?: StorageOptions): Promise<string> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.apiKeyClientSecret);
  }

  async setApiKeyClientSecret(value: string, options?: StorageOptions): Promise<void> {
    if (value == null) {
      await this.secureStorageService.remove(SecureStorageKeys.apiKeyClientSecret);
    } else {
      await this.secureStorageService.save(SecureStorageKeys.apiKeyClientSecret, value);
    }
  }

  async getIsAuthenticated(options?: StorageOptions): Promise<boolean> {
    // Check if access token exists
    const token = await this.getAccessToken(options);
    return token != null;
  }

  async getEntityId(options?: StorageOptions): Promise<string> {
    return await this.storageService.get<string>("entityId");
  }

  async setEntityId(value: string, options?: StorageOptions): Promise<void> {
    if (value == null) {
      await this.storageService.remove("entityId");
    } else {
      await this.storageService.save("entityId", value);
    }
  }
}

// Re-export the abstraction for convenience
export { StateService } from "@/libs/abstractions/state.service";
