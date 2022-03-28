import { Injectable } from "@angular/core";

import { StateVersion } from "jslib-common/enums/stateVersion";
import { StateMigrationService as BaseStateMigrationService } from "jslib-common/services/stateMigration.service";

import { DirectoryType } from "src/enums/directoryType";
import { Account, DirectoryConfigurations, DirectorySettings } from "src/models/account";
import { AzureConfiguration } from "src/models/azureConfiguration";
import { GSuiteConfiguration } from "src/models/gsuiteConfiguration";
import { LdapConfiguration } from "src/models/ldapConfiguration";
import { OktaConfiguration } from "src/models/oktaConfiguration";
import { OneLoginConfiguration } from "src/models/oneLoginConfiguration";
import { SyncConfiguration } from "src/models/syncConfiguration";

const SecureStorageKeys: { [key: string]: any } = {
  ldap: "ldapPassword",
  gsuite: "gsuitePrivateKey",
  azure: "azureKey",
  okta: "oktaToken",
  oneLogin: "oneLoginClientSecret",
  directoryConfigPrefix: "directoryConfig_",
  sync: "syncConfig",
  directoryType: "directoryType",
  organizationId: "organizationId",
};

const Keys: { [key: string]: any } = {
  entityId: "entityId",
  directoryType: "directoryType",
  organizationId: "organizationId",
  lastUserSync: "lastUserSync",
  lastGroupSync: "lastGroupSync",
  lastSyncHash: "lastSyncHash",
  syncingDir: "syncingDir",
  syncConfig: "syncConfig",
  userDelta: "userDeltaToken",
  groupDelta: "groupDeltaToken",
  tempDirectoryConfigs: "tempDirectoryConfigs",
  tempDirectorySettings: "tempDirectorySettings",
};

const StateKeys = {
  global: "global",
  authenticatedAccounts: "authenticatedAccounts",
};

const ClientKeys: { [key: string]: any } = {
  clientIdOld: "clientId",
  clientId: "apikey_clientId",
  clientSecretOld: "clientSecret",
  clientSecret: "apikey_clientSecret",
};

@Injectable()
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

    // Initilize typed objects from key/value pairs in storage to either be saved temporarily until an account is authed or applied to the active account
    const getDirectoryConfig = async <T>(type: DirectoryType) =>
      await this.get<T>(SecureStorageKeys.directoryConfigPrefix + type);
    const directoryConfigs: DirectoryConfigurations = {
      ldap: await getDirectoryConfig<LdapConfiguration>(DirectoryType.Ldap),
      gsuite: await getDirectoryConfig<GSuiteConfiguration>(DirectoryType.GSuite),
      azure: await getDirectoryConfig<AzureConfiguration>(DirectoryType.AzureActiveDirectory),
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
            await this.secureStorageService.get(SecureStorageKeys[key])
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
              `${userId}_${Keys.userDelta}`
            );
            await this.secureStorageService.remove(`${userId}_${Keys.userDelta}`);
          }
          if (await this.secureStorageService.has(`${userId}_${Keys.groupDelta}`)) {
            account.directorySettings.groupDelta = await this.secureStorageService.get(
              `${userId}_${Keys.groupDelta}`
            );
            await this.secureStorageService.remove(`${userId}_${Keys.groupDelta}`);
          }
          await this.set(userId, account);
        })
      );
    }

    const globals = await this.getGlobals();
    globals.stateVersion = StateVersion.Three;
    await this.set(StateKeys.global, globals);
  }
}
