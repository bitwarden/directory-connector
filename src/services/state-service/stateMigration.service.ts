import { StorageService } from "@/jslib/common/src/abstractions/storage.service";
import { HtmlStorageLocation } from "@/jslib/common/src/enums/htmlStorageLocation";
import { StateVersion } from "@/jslib/common/src/enums/stateVersion";
import { StorageOptions } from "@/jslib/common/src/models/domain/storageOptions";

import { DirectoryType } from "@/src/enums/directoryType";
import { DirectoryConfigurations, DirectorySettings } from "@/src/models/account";
import { EntraIdConfiguration } from "@/src/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/src/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/src/models/ldapConfiguration";
import { OktaConfiguration } from "@/src/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/src/models/oneLoginConfiguration";
import {
  MigrationClientKeys as ClientKeys,
  MigrationKeys as Keys,
  MigrationStateKeys as StateKeys,
  SecureStorageKeysMigration as SecureStorageKeys,
  SecureStorageKeysVNext,
  StorageKeysVNext,
} from "@/src/models/state.model";
import { SyncConfiguration } from "@/src/models/syncConfiguration";

export class StateMigrationService {
  constructor(
    protected storageService: StorageService,
    protected secureStorageService: StorageService,
  ) {}

  async needsMigration(): Promise<boolean> {
    const currentStateVersion = await this.getCurrentStateVersion();
    return currentStateVersion == null || currentStateVersion < StateVersion.Latest;
  }

  async migrate(): Promise<void> {
    let currentStateVersion = await this.getCurrentStateVersion();
    while (currentStateVersion < StateVersion.Latest) {
      switch (currentStateVersion) {
        case StateVersion.One:
          await this.migrateClientKeys();
          await this.migrateStateFrom1To2();
          break;
        case StateVersion.Two:
          await this.migrateStateFrom2To3();
          break;
        case StateVersion.Three:
          await this.migrateStateFrom3To4();
          break;
        case StateVersion.Four:
          await this.migrateStateFrom4To5();
          break;
      }
      currentStateVersion += 1;
    }
  }

  // TODO: remove this migration when we are confident existing api keys are all migrated. Probably 1-2 releases.
  protected async migrateClientKeys() {
    const oldClientId = await this.storageService.get<string>(ClientKeys.clientIdOld);
    const oldClientSecret = await this.storageService.get<string>(ClientKeys.clientSecretOld);

    if (oldClientId != null) {
      await this.storageService.save(ClientKeys.clientId, oldClientId);
      await this.storageService.remove(ClientKeys.clientIdOld);
    }

    if (oldClientSecret != null) {
      await this.storageService.save(ClientKeys.clientSecret, oldClientSecret);
      await this.storageService.remove(ClientKeys.clientSecretOld);
    }
  }

  protected async migrateStateFrom1To2(useSecureStorageForSecrets = true): Promise<void> {
    // Grabbing a couple of key settings before they get cleared by the migration
    const userId = await this.get<string>(Keys.entityId);
    const clientId = await this.get<string>(ClientKeys.clientId);
    const clientSecret = await this.get<string>(ClientKeys.clientSecret);

    // Setup reusable method for clearing keys
    const clearDirectoryConnectorV1Keys = async () => {
      for (const key in Keys) {
        if (key == null) {
          continue;
        }
        for (const directoryType in DirectoryType) {
          if (directoryType == null) {
            continue;
          }
          await this.set(SecureStorageKeys.directoryConfigPrefix + directoryType, null);
        }
      }
    };

    // Initialize typed objects from key/value pairs in storage
    const getDirectoryConfig = async <T>(type: DirectoryType) =>
      await this.get<T>(SecureStorageKeys.directoryConfigPrefix + type);
    const directoryConfigs: DirectoryConfigurations = {
      ldap: await getDirectoryConfig<LdapConfiguration>(DirectoryType.Ldap),
      gsuite: await getDirectoryConfig<GSuiteConfiguration>(DirectoryType.GSuite),
      // Azure Active Directory was renamed to Entra ID, but we've kept the old property name
      // to be backwards compatible with existing configurations.
      azure: await getDirectoryConfig<EntraIdConfiguration>(DirectoryType.EntraID),
      entra: await getDirectoryConfig<EntraIdConfiguration>(DirectoryType.EntraID),
      okta: await getDirectoryConfig<OktaConfiguration>(DirectoryType.Okta),
      oneLogin: await getDirectoryConfig<OneLoginConfiguration>(DirectoryType.OneLogin),
    };

    const directorySettings: DirectorySettings = {
      directoryType: await this.get<DirectoryType>(Keys.directoryType),
      organizationId: await this.get<string>(Keys.organizationId),
      lastUserSync: await this.get<Date>(Keys.lastUserSync),
      lastGroupSync: await this.get<Date>(Keys.lastGroupSync),
      lastSyncHash: await this.get<string>(Keys.lastSyncHash),
      syncingDir: await this.get<boolean>(Keys.syncingDir),
      sync: await this.get<SyncConfiguration>(Keys.syncConfig),
      userDelta: await this.get<string>(Keys.userDelta),
      groupDelta: await this.get<string>(Keys.groupDelta),
    };

    // (userId == null) = no authed account, store data temporarily to be applied on next auth
    // (userId != null) = authed account known, apply stored data to it
    if (userId == null) {
      await this.set(Keys.tempDirectoryConfigs, directoryConfigs);
      await this.set(Keys.tempDirectorySettings, directorySettings);
      await clearDirectoryConnectorV1Keys();

      // Set initial state version
      await this.set(StorageKeysVNext.stateVersion, StateVersion.Two);
      return;
    }

    const account = await this.get<any>(userId);
    account.directoryConfigurations = directoryConfigs;
    account.directorySettings = directorySettings;
    account.userId = userId;
    account.entityId = userId;
    account.apiKeyClientId = clientId;
    account.apiKeyClientSecret = clientSecret;

    await this.set(userId, account);
    await clearDirectoryConnectorV1Keys();

    if (useSecureStorageForSecrets) {
      for (const key in SecureStorageKeys) {
        if (await this.secureStorageService.has(SecureStorageKeys[key])) {
          await this.secureStorageService.save(
            `${userId}_${SecureStorageKeys[key]}`,
            await this.secureStorageService.get(SecureStorageKeys[key]),
          );
          await this.secureStorageService.remove(SecureStorageKeys[key]);
        }
      }
    }

    // Update state version
    const globals = await this.getGlobals();
    if (globals) {
      globals.stateVersion = StateVersion.Two;
      await this.set(StateKeys.global, globals);
    } else {
      await this.set(StorageKeysVNext.stateVersion, StateVersion.Two);
    }
  }

  protected async migrateStateFrom2To3(useSecureStorageForSecrets = true): Promise<void> {
    if (useSecureStorageForSecrets) {
      const authenticatedUserIds = await this.get<string[]>(StateKeys.authenticatedAccounts);

      if (authenticatedUserIds && authenticatedUserIds.length > 0) {
        await Promise.all(
          authenticatedUserIds.map(async (userId) => {
            const account = await this.get<any>(userId);

            // Fix for userDelta and groupDelta being put into secure storage when they should not have
            if (await this.secureStorageService.has(`${userId}_${Keys.userDelta}`)) {
              account.directorySettings.userDelta = await this.secureStorageService.get(
                `${userId}_${Keys.userDelta}`,
              );
              await this.secureStorageService.remove(`${userId}_${Keys.userDelta}`);
            }
            if (await this.secureStorageService.has(`${userId}_${Keys.groupDelta}`)) {
              account.directorySettings.groupDelta = await this.secureStorageService.get(
                `${userId}_${Keys.groupDelta}`,
              );
              await this.secureStorageService.remove(`${userId}_${Keys.groupDelta}`);
            }
            await this.set(userId, account);
          }),
        );
      }
    }

    const globals = await this.getGlobals();
    if (globals) {
      globals.stateVersion = StateVersion.Three;
      await this.set(StateKeys.global, globals);
    } else {
      await this.set(StorageKeysVNext.stateVersion, StateVersion.Three);
    }
  }

  protected async migrateStateFrom3To4(): Promise<void> {
    // Placeholder migration for v3→v4 (no changes needed for DC)
    const globals = await this.getGlobals();
    if (globals) {
      globals.stateVersion = StateVersion.Four;
      await this.set(StateKeys.global, globals);
    } else {
      await this.set(StorageKeysVNext.stateVersion, StateVersion.Four);
    }
  }

  /**
   * Migrate from State v4 (Account-based hierarchy) to v5 (flat key-value structure)
   *
   * This is a clean break from the Account-based structure. Data is extracted from
   * the account and saved into flat keys for simpler access.
   *
   * Old structure: authenticatedAccounts -> userId -> account.directorySettings/directoryConfigurations
   * New structure: flat keys like "directoryType", "organizationId", "directory_ldap", etc.
   *
   * Secrets migrate from: {userId}_{secretKey} -> secret_{secretKey}
   */
  protected async migrateStateFrom4To5(useSecureStorageForSecrets = true): Promise<void> {
    // Get the authenticated user IDs from v3 structure
    const authenticatedUserIds = await this.get<string[]>(StateKeys.authenticatedAccounts);

    if (
      !authenticatedUserIds ||
      !Array.isArray(authenticatedUserIds) ||
      authenticatedUserIds.length === 0
    ) {
      // No accounts to migrate, just update version
      await this.set(StorageKeysVNext.stateVersion, StateVersion.Five);
      return;
    }

    // DC is single-user, so we take the first (and likely only) account
    const userId = authenticatedUserIds[0];
    const account = await this.get<any>(userId);

    if (!account) {
      // No account data found, just update version
      await this.set(StorageKeysVNext.stateVersion, StateVersion.Five);
      return;
    }

    // Migrate directory configurations to flat structure
    if (account.directoryConfigurations) {
      if (account.directoryConfigurations.ldap) {
        await this.set(StorageKeysVNext.directory_ldap, account.directoryConfigurations.ldap);
      }
      if (account.directoryConfigurations.gsuite) {
        await this.set(StorageKeysVNext.directory_gsuite, account.directoryConfigurations.gsuite);
      }
      if (account.directoryConfigurations.entra) {
        await this.set(StorageKeysVNext.directory_entra, account.directoryConfigurations.entra);
      } else if (account.directoryConfigurations.azure) {
        // Backwards compatibility: migrate azure to entra
        await this.set(StorageKeysVNext.directory_entra, account.directoryConfigurations.azure);
      }
      if (account.directoryConfigurations.okta) {
        await this.set(StorageKeysVNext.directory_okta, account.directoryConfigurations.okta);
      }
      if (account.directoryConfigurations.oneLogin) {
        await this.set(
          StorageKeysVNext.directory_onelogin,
          account.directoryConfigurations.oneLogin,
        );
      }
    }

    // Migrate directory settings to flat structure
    if (account.directorySettings) {
      if (account.directorySettings.organizationId) {
        await this.set(StorageKeysVNext.organizationId, account.directorySettings.organizationId);
      }
      if (account.directorySettings.directoryType != null) {
        await this.set(StorageKeysVNext.directoryType, account.directorySettings.directoryType);
      }
      if (account.directorySettings.sync) {
        await this.set(StorageKeysVNext.sync, account.directorySettings.sync);
      }
      if (account.directorySettings.lastUserSync) {
        await this.set(SecureStorageKeysVNext.lastUserSync, account.directorySettings.lastUserSync);
      }
      if (account.directorySettings.lastGroupSync) {
        await this.set(
          SecureStorageKeysVNext.lastGroupSync,
          account.directorySettings.lastGroupSync,
        );
      }
      if (account.directorySettings.lastSyncHash) {
        await this.set(SecureStorageKeysVNext.lastSyncHash, account.directorySettings.lastSyncHash);
      }
      if (account.directorySettings.userDelta) {
        await this.set(SecureStorageKeysVNext.userDelta, account.directorySettings.userDelta);
      }
      if (account.directorySettings.groupDelta) {
        await this.set(SecureStorageKeysVNext.groupDelta, account.directorySettings.groupDelta);
      }
      if (account.directorySettings.syncingDir != null) {
        await this.set(StorageKeysVNext.syncingDir, account.directorySettings.syncingDir);
      }
    }

    // Migrate secrets from {userId}_* to secret_* pattern
    if (useSecureStorageForSecrets) {
      const oldSecretKeys = [
        { old: `${userId}_${SecureStorageKeys.ldap}`, new: SecureStorageKeysVNext.ldap },
        { old: `${userId}_${SecureStorageKeys.gsuite}`, new: SecureStorageKeysVNext.gsuite },
        { old: `${userId}_${SecureStorageKeys.azure}`, new: SecureStorageKeysVNext.azure },
        { old: `${userId}_${SecureStorageKeys.entra}`, new: SecureStorageKeysVNext.entra },
        { old: `${userId}_${SecureStorageKeys.okta}`, new: SecureStorageKeysVNext.okta },
        { old: `${userId}_${SecureStorageKeys.oneLogin}`, new: SecureStorageKeysVNext.oneLogin },
      ];

      for (const { old: oldKey, new: newKey } of oldSecretKeys) {
        if (await this.secureStorageService.has(oldKey)) {
          const value = await this.secureStorageService.get(oldKey);
          if (value) {
            await this.secureStorageService.save(newKey, value);
          }
          // @TODO Keep old key for now - will remove in future release
          // await this.secureStorageService.remove(oldKey);
        }
      }
    }

    // Migrate window/tray settings from globals object
    const globals = await this.getGlobals();
    if (globals) {
      if (globals.window) {
        await this.set(StorageKeysVNext.window, globals.window);
      }
      if (globals.enableAlwaysOnTop !== undefined) {
        await this.set(StorageKeysVNext.enableAlwaysOnTop, globals.enableAlwaysOnTop);
      }
      if (globals.enableTray !== undefined) {
        await this.set(StorageKeysVNext.enableTray, globals.enableTray);
      }
      if (globals.enableMinimizeToTray !== undefined) {
        await this.set(StorageKeysVNext.enableMinimizeToTray, globals.enableMinimizeToTray);
      }
      if (globals.enableCloseToTray !== undefined) {
        await this.set(StorageKeysVNext.enableCloseToTray, globals.enableCloseToTray);
      }
      if (globals.alwaysShowDock !== undefined) {
        await this.set(StorageKeysVNext.alwaysShowDock, globals.alwaysShowDock);
      }
    }

    // Migrate environment URLs from account settings
    if (account.settings?.environmentUrls) {
      await this.set(StorageKeysVNext.environmentUrls, account.settings.environmentUrls);
    }

    // Set final state version using the new flat key
    await this.set(StorageKeysVNext.stateVersion, StateVersion.Five);
  }

  // ===================================================================
  // Helper Methods
  // ===================================================================

  protected get options(): StorageOptions {
    return { htmlStorageLocation: HtmlStorageLocation.Local };
  }

  protected get<T>(key: string): Promise<T> {
    return this.storageService.get<T>(key, this.options);
  }

  protected set(key: string, value: any): Promise<any> {
    if (value == null) {
      return this.storageService.remove(key, this.options);
    }
    return this.storageService.save(key, value, this.options);
  }

  protected async getGlobals(): Promise<any> {
    return await this.get<any>(StateKeys.global);
  }

  protected async getCurrentStateVersion(): Promise<StateVersion> {
    // Try new flat structure first
    const flatVersion = await this.get<StateVersion>(StorageKeysVNext.stateVersion);
    if (flatVersion != null) {
      return flatVersion;
    }

    // Fall back to old globals structure
    const globals = await this.getGlobals();
    return globals?.stateVersion ?? StateVersion.One;
  }
}
