import { StorageService } from "@/libs/abstractions/storage.service";
import { APPLICATION_NAME } from "@/libs/constants";
import { DirectoryType } from "@/libs/enums/directoryType";
import { HtmlStorageLocation } from "@/libs/enums/htmlStorageLocation";
import { StateVersion } from "@/libs/enums/stateVersion";
import { DirectoryConnectorProfile } from "@/libs/models/directoryConnectorProfile";
import { StorageOptions } from "@/libs/models/domain/storageOptions";
import {
  SecureStorageKey,
  SecureStorageKeys,
  StorageKey,
  StorageKeys,
} from "@/libs/models/state.model";

import { generateConfigId } from "./secret-storage-key.util";

import { passwords } from "dc-native";

// The original implementation of migrate() overrode the jslib implementation and never actually went up
// to v4. Therefore, the minimum supported version that is out in the wild should be 3 and we need
// to support migrating from v3 directly to v5.
const MinSupportedStateVersion = StateVersion.Three;

const SECURE_STORAGE_SERVICE_NAME = APPLICATION_NAME;

export class StateMigrationService {
  constructor(
    protected storageService: StorageService,
    protected secureStorageService: StorageService,
  ) {}

  async needsMigration(): Promise<boolean> {
    const currentStateVersion = await this.getCurrentStateVersion();
    return currentStateVersion == null || currentStateVersion < StateVersion.Latest;
  }

  /**
   * Ensure stateVersion is persisted in storage. On a fresh install needsMigration() returns
   * false (no data to migrate) so migrate() is never called, leaving stateVersion absent from
   * data.json. Calling this after the migration check guarantees the key is always written.
   */
  async stampVersion(): Promise<void> {
    const stored = await this.get<StateVersion>(StorageKeys.stateVersion);
    if (stored == null) {
      await this.set(StorageKeys.stateVersion, StateVersion.Latest);
    }
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
        case StateVersion.Five:
          await this.migrateStateFrom5To6();
          break;
        case StateVersion.Six:
          await this.migrateStateFrom6To7();
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

    const clientId = await this.storageService.get<string>("activeUserId");
    const account = await this.get<any>(clientId);

    if (!account) {
      // No account data found, just update version
      await this.set(StorageKeys.stateVersion, StateVersion.Five);
      return;
    }

    // Migrate directory configurations to flat structure.
    // Secrets within these configs are migrated separately below via secure storage key migration.
    if (account.directoryConfigurations) {
      if (account.directoryConfigurations.ldap) {
        await this.set(StorageKeys.directoryLdap, { ...account.directoryConfigurations.ldap });
      }
      if (account.directoryConfigurations.gsuite) {
        await this.set(StorageKeys.directoryGsuite, { ...account.directoryConfigurations.gsuite });
      }
      if (account.directoryConfigurations.entra) {
        await this.set(StorageKeys.directoryEntra, { ...account.directoryConfigurations.entra });
      } else if (account.directoryConfigurations.azure) {
        // Backwards compatibility: migrate azure to entra
        await this.set(StorageKeys.directoryEntra, { ...account.directoryConfigurations.azure });
      }
      if (account.directoryConfigurations.okta) {
        await this.set(StorageKeys.directoryOkta, { ...account.directoryConfigurations.okta });
      }
      if (account.directoryConfigurations.oneLogin) {
        await this.set(StorageKeys.directoryOnelogin, {
          ...account.directoryConfigurations.oneLogin,
        });
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
        await this.set(StorageKeys.lastUserSync, account.directorySettings.lastUserSync);
      }
      if (account.directorySettings.lastGroupSync) {
        await this.set(StorageKeys.lastGroupSync, account.directorySettings.lastGroupSync);
      }
      if (account.directorySettings.lastSyncHash) {
        await this.set(StorageKeys.lastSyncHash, account.directorySettings.lastSyncHash);
      }
      if (account.directorySettings.userDelta) {
        await this.set(StorageKeys.userDelta, account.directorySettings.userDelta);
      }
      if (account.directorySettings.groupDelta) {
        await this.set(StorageKeys.groupDelta, account.directorySettings.groupDelta);
      }
      if (account.directorySettings.syncingDir != null) {
        await this.set(StorageKeys.syncingDir, account.directorySettings.syncingDir);
      }
    }

    // Migrate secrets from {userId}_* to their new flat keys.
    // The old key names are the legacy values used before this migration.
    // Old keys are intentionally kept — they will be removed in a future migration.
    // Note: keytar encoding conversion (UTF-8 → UTF-16) is handled separately in migrateStateFrom5To6.
    if (useSecureStorageForSecrets) {
      const oldSecretKeys = [
        { old: `${clientId}_ldapPassword`, new: SecureStorageKeys.ldap },
        { old: `${clientId}_gsuitePrivateKey`, new: SecureStorageKeys.gsuite },
        { old: `${clientId}_azureKey`, new: SecureStorageKeys.azure },
        // _entraIdKey is the canonical old key; _entraKey was used by the runtime state service
        // prior to the v4→v5 migration. Only one should be present, but prefer _entraIdKey.
        {
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
        if (await this.secureStorageService.has(oldKey)) {
          const value = await this.secureStorageService.get(oldKey);
          if (value) {
            await this.secureStorageService.save(newKey, value);
          }
        }
      }

      // Migrate apiKeyClientId and apiKeyClientSecret from account object to secure storage
      if (account.profile?.apiKeyClientId) {
        await this.secureStorageService.save(
          SecureStorageKeys.apiKeyClientId,
          account.profile.apiKeyClientId,
        );
      }
      if (account.keys?.apiKeyClientSecret) {
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

  /**
   * Migrate from State v5 to v6 — convert any Windows Credential Manager entries that were
   * written by keytar (UTF-8 via CredWriteA) to the UTF-16 format used by desktop_core
   * (CredWriteW). This is a no-op on macOS and Linux; migrateKeytarPassword returns false
   * immediately on those platforms.
   *
   * Keys migrated:
   *   • All current flat SecureStorageKeys (secret_*, accessToken, etc.)
   *   • Non-sensitive sync metadata keys (StorageKeys.userDelta/groupDelta/lastUserSync/lastGroupSync)
   *     which were previously written to keytar but are now stored in regular storage
   */
  protected async migrateStateFrom5To6(): Promise<void> {
    // All keys that may have been written by keytar in previous versions and need re-encoding
    // from UTF-8 (CredWriteA) to UTF-16 (CredWriteW) for desktop_core compatibility.
    const credentialKeys: string[] = [
      SecureStorageKeys.ldap,
      SecureStorageKeys.gsuite,
      SecureStorageKeys.azure,
      SecureStorageKeys.entra,
      SecureStorageKeys.okta,
      SecureStorageKeys.oneLogin,
      SecureStorageKeys.accessToken,
      SecureStorageKeys.refreshToken,
      SecureStorageKeys.apiKeyClientId,
      SecureStorageKeys.apiKeyClientSecret,
      SecureStorageKeys.twoFactorToken,
    ];

    await Promise.all(
      credentialKeys.map((key) =>
        passwords.migrateKeytarPassword(SECURE_STORAGE_SERVICE_NAME, key),
      ),
    );

    await this.set(StorageKeys.stateVersion, StateVersion.Six);
  }

  /**
   * Migrate from State v6 to v7 — introduce support for multiple saved directory-connector
   * configurations ("profiles", see directoryConnectorProfile.ts). Prior to this version,
   * `data.json` could only ever describe a single active configuration at a handful of fixed
   * top-level keys (`directoryType`, `organizationId`, `sync`, `directoryLdap`, etc.).
   *
   * Those flat keys are kept (they continue to describe whichever profile is "active"), but any
   * existing configuration found there is additionally wrapped into a single profile named
   * "Default" so it shows up alongside any new profiles the user creates. The profile reuses the
   * `id` already assigned to the active directory type's config (if any), so its secure-storage
   * secret keeps resolving correctly without needing to touch secure storage during migration.
   */
  protected async migrateStateFrom6To7(): Promise<void> {
    const directoryType = await this.get<DirectoryType>(StorageKeys.directoryType);
    const organizationId = await this.get<string>(StorageKeys.organizationId);

    if (directoryType != null || organizationId != null) {
      const ldap = await this.get<DirectoryConnectorProfile["ldap"]>(StorageKeys.directoryLdap);
      const gsuite = await this.get<DirectoryConnectorProfile["gsuite"]>(
        StorageKeys.directoryGsuite,
      );
      const entra = await this.get<DirectoryConnectorProfile["entra"]>(StorageKeys.directoryEntra);
      const okta = await this.get<DirectoryConnectorProfile["okta"]>(StorageKeys.directoryOkta);
      const oneLogin = await this.get<DirectoryConnectorProfile["oneLogin"]>(
        StorageKeys.directoryOnelogin,
      );

      const configsByType: Partial<Record<DirectoryType, { id?: string }>> = {
        [DirectoryType.Ldap]: ldap,
        [DirectoryType.GSuite]: gsuite,
        [DirectoryType.EntraID]: entra,
        [DirectoryType.Okta]: okta,
        [DirectoryType.OneLogin]: oneLogin,
      };

      const profile: DirectoryConnectorProfile = {
        id: configsByType[directoryType]?.id ?? generateConfigId(),
        name: "Default",
        directoryType,
        organizationId,
        sync: await this.get(StorageKeys.sync),
        ldap,
        gsuite,
        entra,
        okta,
        oneLogin,
        userDelta: await this.get(StorageKeys.userDelta),
        groupDelta: await this.get(StorageKeys.groupDelta),
        lastUserSync: await this.get(StorageKeys.lastUserSync),
        lastGroupSync: await this.get(StorageKeys.lastGroupSync),
        lastSyncHash: await this.get(StorageKeys.lastSyncHash),
        syncingDir: await this.get(StorageKeys.syncingDir),
      };

      await this.set(StorageKeys.directoryProfiles, [profile]);
      await this.set(StorageKeys.activeDirectoryProfileId, profile.id);
    }

    await this.set(StorageKeys.stateVersion, StateVersion.Seven);
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
