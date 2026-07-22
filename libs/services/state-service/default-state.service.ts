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
import {
  SecureStorageKey,
  SecureStorageKeys,
  StorageKeys,
  StoredSecurely,
} from "@/libs/models/state.model";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

import { StateService } from "./default-state.service";
import {
  entraConfigsShareIdentity,
  generateConfigId,
  gsuiteConfigsShareIdentity,
  ldapConfigsShareIdentity,
  oktaConfigsShareIdentity,
  oneLoginConfigsShareIdentity,
} from "./secret-storage-key.util";
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
    await this.stateMigrationService.stampVersion();
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
          (configWithSecrets as any).password = await this.getLdapSecret(
            config as LdapConfiguration,
          );
          break;
        case DirectoryType.EntraID:
          (configWithSecrets as any).key = await this.getEntraSecret(
            config as EntraIdConfiguration,
          );
          break;
        case DirectoryType.Okta:
          (configWithSecrets as any).token = await this.getOktaSecret(config as OktaConfiguration);
          break;
        case DirectoryType.GSuite:
          (configWithSecrets as any).privateKey = await this.getGsuiteSecret(
            config as GSuiteConfiguration,
          );
          break;
        case DirectoryType.OneLogin:
          (configWithSecrets as any).clientSecret = await this.getOneLoginSecret(
            config as OneLoginConfiguration,
          );
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
          const previous = await this.getLdapConfiguration();
          ldapConfig.id = this.resolveConfigId(
            previous,
            ldapConfigsShareIdentity(previous, ldapConfig),
          );
          await this.setLdapSecret(ldapConfig, ldapConfig.password);
          ldapConfig.password = StoredSecurely;
          await this.setLdapConfiguration(ldapConfig);
          break;
        }
        case DirectoryType.EntraID: {
          const entraConfig = config as EntraIdConfiguration;
          const previous = await this.getEntraConfiguration();
          entraConfig.id = this.resolveConfigId(
            previous,
            entraConfigsShareIdentity(previous, entraConfig),
          );
          await this.setEntraSecret(entraConfig, entraConfig.key);
          entraConfig.key = StoredSecurely;
          await this.setEntraConfiguration(entraConfig);
          break;
        }
        case DirectoryType.Okta: {
          const oktaConfig = config as OktaConfiguration;
          const previous = await this.getOktaConfiguration();
          oktaConfig.id = this.resolveConfigId(
            previous,
            oktaConfigsShareIdentity(previous, oktaConfig),
          );
          await this.setOktaSecret(oktaConfig, oktaConfig.token);
          oktaConfig.token = StoredSecurely;
          await this.setOktaConfiguration(oktaConfig);
          break;
        }
        case DirectoryType.GSuite: {
          const gsuiteConfig = config as GSuiteConfiguration;
          const previous = await this.getGsuiteConfiguration();
          gsuiteConfig.id = this.resolveConfigId(
            previous,
            gsuiteConfigsShareIdentity(previous, gsuiteConfig),
          );
          if (gsuiteConfig.privateKey == null) {
            await this.setGsuiteSecret(gsuiteConfig, null);
          } else {
            const normalizedPrivateKey = gsuiteConfig.privateKey.replace(/\\n/g, "\n");
            await this.setGsuiteSecret(gsuiteConfig, normalizedPrivateKey);
            gsuiteConfig.privateKey = StoredSecurely;
          }
          await this.setGsuiteConfiguration(gsuiteConfig);
          break;
        }
        case DirectoryType.OneLogin: {
          const oneLoginConfig = config as OneLoginConfiguration;
          const previous = await this.getOneLoginConfiguration();
          oneLoginConfig.id = this.resolveConfigId(
            previous,
            oneLoginConfigsShareIdentity(previous, oneLoginConfig),
          );
          await this.setOneLoginSecret(oneLoginConfig, oneLoginConfig.clientSecret);
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

  /**
   * Decides the `id` a configuration should be saved with: the previous configuration's id is
   * reused when the new configuration represents the same account/identity (e.g. a password
   * rotation), otherwise a fresh id is generated (e.g. switching to a different AD service
   * account). Keeping the id stable across identity-preserving saves means the secure-storage
   * slot is updated in place rather than accumulating a new orphaned entry on every save.
   */
  private resolveConfigId(
    previous: { id?: string } | null | undefined,
    sameIdentity: boolean,
  ): string {
    if (sameIdentity && previous?.id != null) {
      return previous.id;
    }
    return generateConfigId();
  }

  /**
   * Builds a secure storage key scoped to a specific configuration's `id`, falling back to the
   * given legacy/unscoped key when no id is available. This keeps secrets for distinct
   * configurations (e.g. two AD service accounts) from colliding in OS secure storage. See
   * secret-storage-key.util.ts for details.
   */
  private scopedSecretKey(legacyKey: SecureStorageKey, id: string): SecureStorageKey {
    return `${legacyKey}:${id}` as SecureStorageKey;
  }

  private async getScopedSecret(
    legacyKey: SecureStorageKey,
    id: string | null | undefined,
  ): Promise<string | null> {
    if (id != null) {
      const scoped = await this.secureStorageService.get<string>(
        this.scopedSecretKey(legacyKey, id),
      );
      if (scoped != null) {
        return scoped;
      }
    }
    // Fall back to the legacy, unscoped key for installs upgrading from a version that stored
    // a single shared secret per directory type, regardless of which configuration was active.
    return await this.secureStorageService.get<string>(legacyKey);
  }

  private async setScopedSecret(
    legacyKey: SecureStorageKey,
    id: string | null | undefined,
    value: string,
  ): Promise<void> {
    const key = id != null ? this.scopedSecretKey(legacyKey, id) : legacyKey;
    if (value == null) {
      await this.secureStorageService.remove(key);
      // Also clear the legacy unscoped key so clearing a secret always fully clears it,
      // even if it hadn't been migrated to a scoped key yet.
      if (id != null) {
        await this.secureStorageService.remove(legacyKey);
      }
    } else {
      await this.secureStorageService.save(key, value);
    }
  }

  private async getLdapSecret(config: LdapConfiguration): Promise<string> {
    return await this.getScopedSecret(SecureStorageKeys.ldap, config?.id);
  }

  private async setLdapSecret(config: LdapConfiguration, value: string): Promise<void> {
    await this.setScopedSecret(SecureStorageKeys.ldap, config.id, value);
  }

  private async getGsuiteSecret(config: GSuiteConfiguration): Promise<string> {
    return await this.getScopedSecret(SecureStorageKeys.gsuite, config?.id);
  }

  private async setGsuiteSecret(config: GSuiteConfiguration, value: string): Promise<void> {
    await this.setScopedSecret(SecureStorageKeys.gsuite, config.id, value);
  }

  private async getEntraSecret(config: EntraIdConfiguration): Promise<string> {
    const entraKey = await this.getScopedSecret(SecureStorageKeys.entra, config?.id);
    if (entraKey != null) {
      return entraKey;
    }
    // Try new key first, fall back to old azure key for backwards compatibility
    return await this.getScopedSecret(SecureStorageKeys.azure, config?.id);
  }

  private async setEntraSecret(config: EntraIdConfiguration, value: string): Promise<void> {
    if (value == null) {
      await this.setScopedSecret(SecureStorageKeys.entra, config.id, null);
      await this.setScopedSecret(SecureStorageKeys.azure, config.id, null);
    } else {
      await this.setScopedSecret(SecureStorageKeys.entra, config.id, value);
    }
  }

  private async getOktaSecret(config: OktaConfiguration): Promise<string> {
    return await this.getScopedSecret(SecureStorageKeys.okta, config?.id);
  }

  private async setOktaSecret(config: OktaConfiguration, value: string): Promise<void> {
    await this.setScopedSecret(SecureStorageKeys.okta, config.id, value);
  }

  private async getOneLoginSecret(config: OneLoginConfiguration): Promise<string> {
    return await this.getScopedSecret(SecureStorageKeys.oneLogin, config?.id);
  }

  private async setOneLoginSecret(config: OneLoginConfiguration, value: string): Promise<void> {
    await this.setScopedSecret(SecureStorageKeys.oneLogin, config.id, value);
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
