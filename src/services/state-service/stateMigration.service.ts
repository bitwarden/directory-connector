import { StorageService } from "@/jslib/common/src/abstractions/storage.service";
import { HtmlStorageLocation } from "@/jslib/common/src/enums/htmlStorageLocation";
import { StateVersion } from "@/jslib/common/src/enums/stateVersion";
import { StorageOptions } from "@/jslib/common/src/models/domain/storageOptions";

import {
  SecureStorageKey,
  SecureStorageKeys,
  StorageKey,
  StorageKeys,
  StoredSecurely,
} from "@/src/models/state.model";

// The original implementation of migrate() overrode the jslib implementation and never actually went up
// to v4. Therefore, the minimum supported version that is out in the wild should be 3 and we need
// to support migrating from v3 directly to v5.
const MinSupportedStateVersion = StateVersion.Three;

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

    if (currentStateVersion < MinSupportedStateVersion) {
      throw new Error(
        `Your Directory Connector data is too old to migrate (state version ${currentStateVersion}). ` +
          `Please download a fresh copy of Directory Connector and reconfigure it.`,
      );
    }

    while (currentStateVersion < StateVersion.Latest) {
      switch (currentStateVersion) {
        case StateVersion.Three:
        case StateVersion.Four:
          await this.migrateStateFrom3To5();
          break;
      }
      currentStateVersion += 1;
    }
  }

  /**
   * Migrate from State v3 (Account-based hierarchy) to v5 (flat key-value structure)
   *
   * This is a clean break from the Account-based structure. Data is extracted from
   * the account and saved into flat keys for simpler access.
   */
  protected async migrateStateFrom3To5(useSecureStorageForSecrets = true): Promise<void> {
    const currentStateVersion = await this.getCurrentStateVersion();

    if (currentStateVersion == StateVersion.Five) {
      return;
    }

    //@ts-expect-error untracked legacy key for migration
    const clientId = await this.storageService.get<string>("activeUserId");
    //@ts-expect-error untracked legacy key for migration
    const account = await this.get<any>(clientId);

    if (!account) {
      // No account data found, just update version
      await this.set(StorageKeys.stateVersion, StateVersion.Five);
      return;
    }

    // Migrate directory configurations to flat structure
    if (account.directoryConfigurations) {
      if (account.directoryConfigurations.ldap) {
        const ldapConfig = { ...account.directoryConfigurations.ldap };
        await this.secureStorageService.save(SecureStorageKeys.ldap, ldapConfig.password);
        ldapConfig.password = StoredSecurely;
        await this.set(StorageKeys.directoryLdap, ldapConfig);
      }
      if (account.directoryConfigurations.gsuite) {
        const gsuiteConfig = { ...account.directoryConfigurations.gsuite };
        await this.secureStorageService.save(SecureStorageKeys.gsuite, gsuiteConfig.privateKey);
        gsuiteConfig.privateKey = StoredSecurely;
        await this.set(StorageKeys.directoryGsuite, gsuiteConfig);
      }
      if (account.directoryConfigurations.entra) {
        const entraConfig = { ...account.directoryConfigurations.entra };
        await this.secureStorageService.save(SecureStorageKeys.entra, entraConfig.key);
        entraConfig.key = StoredSecurely;
        await this.set(StorageKeys.directoryEntra, entraConfig);
      } else if (account.directoryConfigurations.azure) {
        // Backwards compatibility: migrate azure to entra
        const azureConfig = { ...account.directoryConfigurations.azure };
        await this.secureStorageService.save(SecureStorageKeys.entra, azureConfig.key);
        azureConfig.key = StoredSecurely;
        await this.set(StorageKeys.directoryEntra, azureConfig);
      }
      if (account.directoryConfigurations.okta) {
        const oktaConfig = { ...account.directoryConfigurations.okta };
        await this.secureStorageService.save(SecureStorageKeys.okta, oktaConfig.token);
        oktaConfig.token = StoredSecurely;
        await this.set(StorageKeys.directoryOkta, oktaConfig);
      }
      if (account.directoryConfigurations.oneLogin) {
        const oneLoginConfig = { ...account.directoryConfigurations.oneLogin };
        await this.secureStorageService.save(
          SecureStorageKeys.oneLogin,
          oneLoginConfig.clientSecret,
        );
        oneLoginConfig.clientSecret = StoredSecurely;
        await this.set(StorageKeys.directoryOnelogin, oneLoginConfig);
      }
    }

    // Migrate directory settings to flat structure
    if (account.directorySettings) {
      if (account.directorySettings.organizationId) {
        await this.set(StorageKeys.organizationId, account.directorySettings.organizationId);
      }
      if (account.directorySettings.directoryType != null) {
        await this.set(StorageKeys.directoryType, account.directorySettings.directoryType);
      }
      if (account.directorySettings.sync) {
        await this.set(StorageKeys.sync, account.directorySettings.sync);
      }
      if (account.directorySettings.lastUserSync) {
        await this.set(SecureStorageKeys.lastUserSync, account.directorySettings.lastUserSync);
      }
      if (account.directorySettings.lastGroupSync) {
        await this.set(SecureStorageKeys.lastGroupSync, account.directorySettings.lastGroupSync);
      }
      if (account.directorySettings.lastSyncHash) {
        await this.set(StorageKeys.lastSyncHash, account.directorySettings.lastSyncHash);
      }
      if (account.directorySettings.userDelta) {
        await this.set(SecureStorageKeys.userDelta, account.directorySettings.userDelta);
      }
      if (account.directorySettings.groupDelta) {
        await this.set(SecureStorageKeys.groupDelta, account.directorySettings.groupDelta);
      }
      if (account.directorySettings.syncingDir != null) {
        await this.set(StorageKeys.syncingDir, account.directorySettings.syncingDir);
      }
    }

    // Migrate secrets from {userId}_* to their new flat keys.
    // The old key names are the legacy values used before this migration.
    // Old keys are intentionally kept — they will be removed in a future migration.
    if (useSecureStorageForSecrets) {
      const oldSecretKeys = [
        { old: `${clientId}_ldapPassword`, new: SecureStorageKeys.ldap },
        { old: `${clientId}_gsuitePrivateKey`, new: SecureStorageKeys.gsuite },
        { old: `${clientId}_azureKey`, new: SecureStorageKeys.azure },
        // _entraIdKey is the canonical old key; _entraKey was used by the runtime state service
        // prior to the v4→v5 migration. Only one should be present, but prefer _entraIdKey.
        {
          //@ts-expect-error untracked legacy key for migration
          old: (await this.secureStorageService.has(`${clientId}_entraIdKey`))
            ? `${clientId}_entraIdKey`
            : `${clientId}_entraKey`,
          new: SecureStorageKeys.entra,
        },
        { old: `${clientId}_oktaToken`, new: SecureStorageKeys.okta },
        { old: `${clientId}_oneLoginClientSecret`, new: SecureStorageKeys.oneLogin },
        { old: `${clientId}_accessToken`, new: SecureStorageKeys.accessToken },
        { old: `${clientId}_refreshToken`, new: SecureStorageKeys.refreshToken },
        { old: `${clientId}_twoFactorToken`, new: SecureStorageKeys.twoFactorToken },
      ];

      for (const { old: oldKey, new: newKey } of oldSecretKeys) {
        //@ts-expect-error untracked legacy key for migration
        if (await this.secureStorageService.has(oldKey)) {
          //@ts-expect-error untracked legacy key for migration
          const value = await this.secureStorageService.get(oldKey);
          if (value) {
            await this.secureStorageService.save(newKey, value);
          }
        }
      }

      // Migrate apiKeyClientId and apiKeyClientSecret from account object to secure storage
      if (account.profile.apiKeyClientId) {
        await this.secureStorageService.save(
          SecureStorageKeys.apiKeyClientId,
          account.profile.apiKeyClientId,
        );
      }
      if (account.keys.apiKeyClientSecret) {
        await this.secureStorageService.save(
          SecureStorageKeys.apiKeyClientSecret,
          account.keys.apiKeyClientSecret,
        );
      }
      if (account.tokens) {
        await this.secureStorageService.save(
          SecureStorageKeys.accessToken,
          account.tokens.accessToken,
        );
      }
    }

    // Migrate window/tray settings from globals object
    const globals = await this.getGlobals();
    if (globals) {
      if (globals.window) {
        await this.set(StorageKeys.window, globals.window);
      }
      if (globals.enableAlwaysOnTop != null) {
        await this.set(StorageKeys.enableAlwaysOnTop, globals.enableAlwaysOnTop);
      }
      if (globals.enableTray != null) {
        await this.set(StorageKeys.enableTray, globals.enableTray);
      }
      if (globals.enableMinimizeToTray != null) {
        await this.set(StorageKeys.enableMinimizeToTray, globals.enableMinimizeToTray);
      }
      if (globals.enableCloseToTray != null) {
        await this.set(StorageKeys.enableCloseToTray, globals.enableCloseToTray);
      }
      if (globals.alwaysShowDock != null) {
        await this.set(StorageKeys.alwaysShowDock, globals.alwaysShowDock);
      }
      if (globals.environmentUrls != null) {
        await this.set(StorageKeys.environmentUrls, globals.environmentUrls);
      }
    }

    // Set final state version using the new flat key
    await this.set(StorageKeys.stateVersion, StateVersion.Five);
  }

  // ===================================================================
  // Helper Methods
  // ===================================================================

  protected get options(): StorageOptions {
    return { htmlStorageLocation: HtmlStorageLocation.Local };
  }

  protected get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    return this.storageService.get<T>(key, this.options);
  }

  protected set(key: StorageKey | SecureStorageKey, value: any): Promise<any> {
    if (value == null) {
      return this.storageService.remove(key, this.options);
    }
    return this.storageService.save(key, value, this.options);
  }

  protected async getGlobals(): Promise<any> {
    return await this.get<any>("global");
  }

  protected async getCurrentStateVersion(): Promise<StateVersion> {
    // Try new flat structure first
    const flatVersion = await this.get<StateVersion>(StorageKeys.stateVersion);
    if (flatVersion != null) {
      return flatVersion;
    }

    // Fall back to old globals structure
    const globals = await this.getGlobals();
    if (globals == null) {
      // No data at all — fresh install, no migration needed
      return StateVersion.Latest;
    }
    return globals?.stateVersion ?? StateVersion.Latest;
  }
}
