import { StateVersion } from "@/jslib/common/src/enums/stateVersion";
import { StateMigrationService as BaseStateMigrationService } from "@/jslib/common/src/services/stateMigration.service";

import { DirectoryType } from "@/src/enums/directoryType";
import { Account, DirectoryConfigurations, DirectorySettings } from "@/src/models/account";
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
} from "@/src/models/state.model";
import { SyncConfiguration } from "@/src/models/syncConfiguration";

export class StateMigrationService extends BaseStateMigrationService {
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
    // Grabbing a couple of key settings before they get cleared by the base migration
    const userId = await this.get<string>(Keys.entityId);
    const clientId = await this.get<string>(ClientKeys.clientId);
    const clientSecret = await this.get<string>(ClientKeys.clientSecret);

    await super.migrateStateFrom1To2();

    // Setup reusable method for clearing keys since we will want to do that regardless of if there is an active authenticated session
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

    // Initialize typed objects from key/value pairs in storage to either be saved temporarily until an account is authed or applied to the active account
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

    // (userId == null) = no authed account, stored data temporarily to be applied and cleared on next auth
    // (userId != null) = authed account known, applied stored data to it and do not save temp data
    if (userId == null) {
      await this.set(Keys.tempDirectoryConfigs, directoryConfigs);
      await this.set(Keys.tempDirectorySettings, directorySettings);
      await clearDirectoryConnectorV1Keys();
      return;
    }

    const account = await this.get<Account>(userId);
    account.directoryConfigurations = directoryConfigs;
    account.directorySettings = directorySettings;
    account.profile = {
      userId: userId,
      entityId: userId,
      apiKeyClientId: clientId,
    };
    account.clientKeys = {
      clientId: clientId,
      clientSecret: clientSecret,
    };

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
  }
  protected async migrateStateFrom2To3(useSecureStorageForSecrets = true): Promise<void> {
    if (useSecureStorageForSecrets) {
      const authenticatedUserIds = await this.get<string[]>(StateKeys.authenticatedAccounts);

      await Promise.all(
        authenticatedUserIds.map(async (userId) => {
          const account = await this.get<Account>(userId);

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

    const globals = await this.getGlobals();
    globals.stateVersion = StateVersion.Three;
    await this.set(StateKeys.global, globals);
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

    if (!authenticatedUserIds || authenticatedUserIds.length === 0) {
      // No accounts to migrate, just update version
      const globals = await this.getGlobals();
      globals.stateVersion = StateVersion.Four;
      await this.set(StateKeys.global, globals);
      return;
    }

    // DC is single-user, so we take the first (and likely only) account
    const userId = authenticatedUserIds[0];
    const account = await this.get<Account>(userId);

    if (!account) {
      // No account data found, just update version
      const globals = await this.getGlobals();
      globals.stateVersion = StateVersion.Four;
      await this.set(StateKeys.global, globals);
      return;
    }

    // Migrate directory configurations to flat structure
    if (account.directoryConfigurations) {
      if (account.directoryConfigurations.ldap) {
        await this.set("directory_ldap", account.directoryConfigurations.ldap);
      }
      if (account.directoryConfigurations.gsuite) {
        await this.set("directory_gsuite", account.directoryConfigurations.gsuite);
      }
      if (account.directoryConfigurations.entra) {
        await this.set("directory_entra", account.directoryConfigurations.entra);
      } else if (account.directoryConfigurations.azure) {
        // Backwards compatibility: migrate azure to entra
        await this.set("directory_entra", account.directoryConfigurations.azure);
      }
      if (account.directoryConfigurations.okta) {
        await this.set("directory_okta", account.directoryConfigurations.okta);
      }
      if (account.directoryConfigurations.oneLogin) {
        await this.set("directory_onelogin", account.directoryConfigurations.oneLogin);
      }
    }

    // Migrate directory settings to flat structure
    if (account.directorySettings) {
      if (account.directorySettings.organizationId) {
        await this.set("organizationId", account.directorySettings.organizationId);
      }
      if (account.directorySettings.directoryType != null) {
        await this.set("directoryType", account.directorySettings.directoryType);
      }
      if (account.directorySettings.sync) {
        await this.set("sync", account.directorySettings.sync);
      }
      if (account.directorySettings.lastUserSync) {
        await this.set("lastUserSync", account.directorySettings.lastUserSync);
      }
      if (account.directorySettings.lastGroupSync) {
        await this.set("lastGroupSync", account.directorySettings.lastGroupSync);
      }
      if (account.directorySettings.lastSyncHash) {
        await this.set("lastSyncHash", account.directorySettings.lastSyncHash);
      }
      if (account.directorySettings.userDelta) {
        await this.set("userDelta", account.directorySettings.userDelta);
      }
      if (account.directorySettings.groupDelta) {
        await this.set("groupDelta", account.directorySettings.groupDelta);
      }
      if (account.directorySettings.syncingDir != null) {
        await this.set("syncingDir", account.directorySettings.syncingDir);
      }
    }

    // Migrate secrets from {userId}_* to secret_* pattern
    if (useSecureStorageForSecrets) {
      const oldSecretKeys = [
        { old: `${userId}_${SecureStorageKeys.ldap}`, new: "secret_ldap" },
        { old: `${userId}_${SecureStorageKeys.gsuite}`, new: "secret_gsuite" },
        { old: `${userId}_${SecureStorageKeys.azure}`, new: "secret_azure" },
        { old: `${userId}_${SecureStorageKeys.entra}`, new: "secret_entra" },
        { old: `${userId}_${SecureStorageKeys.okta}`, new: "secret_okta" },
        { old: `${userId}_${SecureStorageKeys.oneLogin}`, new: "secret_onelogin" },
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

    const globals = await this.getGlobals();
    globals.stateVersion = StateVersion.Five;
    await this.set(StateKeys.global, globals);
  }
}
