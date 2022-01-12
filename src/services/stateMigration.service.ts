import { HtmlStorageLocation } from "jslib-common/enums/htmlStorageLocation";
import { State } from "jslib-common/models/domain/state";

import { StateMigrationService as BaseStateMigrationService } from "jslib-common/services/stateMigration.service";

import { StateVersion } from "jslib-common/enums/stateVersion";

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
  userDelta: "userDeltaToken",
  groupDelta: "groupDeltaToken",
  organizationId: "organizationId",
};

const Keys: { [key: string]: any } = {
  state: "state",
  entityId: "entityId",
  directoryType: "directoryType",
  organizationId: "organizationId",
  lastUserSync: "lastUserSync",
  lastGroupSync: "lastGroupSync",
  lastSyncHash: "lastSyncHash",
  syncingDir: "syncingDir",
  syncConfig: "syncConfig",
};

const ClientKeys: { [key: string]: any } = {
  clientIdOld: "clientId",
  clientId: "apikey_clientId",
  clientSecretOld: "clientSecret",
  clientSecret: "apikey_clientSecret",
};

export class StateMigrationService extends BaseStateMigrationService {
  async migrate(): Promise<void> {
    let currentStateVersion =
      (await this.storageService.get<State<Account>>("state"))?.globals?.stateVersion ?? StateVersion.One;
    while (currentStateVersion < StateVersion.Latest) {
      switch (currentStateVersion) {
        case StateVersion.One:
          await this.migrateClientKeys();
          await this.migrateStateFrom1To2();
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

  protected async migrateStateFrom1To2(useSecureStorageForSecrets: boolean = true): Promise<void> {
    await super.migrateStateFrom1To2();
    const state = await this.storageService.get<State<Account>>(Keys.state);
    const userId = await this.storageService.get<string>(Keys.entityId);

    if (userId != null) {
      state.accounts[userId] = new Account({
        directorySettings: {
          directoryType: await this.storageService.get<DirectoryType>(Keys.directoryType),
          organizationId: await this.storageService.get<string>(Keys.organizationId),
          lastUserSync: await this.storageService.get<Date>(Keys.lastUserSync),
          lastGroupSync: await this.storageService.get<Date>(Keys.lastGroupSync),
          lastSyncHash: await this.storageService.get<string>(Keys.lastSyncHash),
          syncingDir: await this.storageService.get<boolean>(Keys.syncingDir),
          sync: await this.storageService.get<SyncConfiguration>(Keys.syncConfig),
        },
        profile: {
          entityId: await this.storageService.get<string>(Keys.entityId),
        },
        directoryConfigurations: new DirectoryConfigurations(),
        clientKeys: {
          clientId: await this.storageService.get<string>(ClientKeys.clientId),
          clientSecret: await this.storageService.get<string>(ClientKeys.clientSecret),
        },
      });
    }

    for (const key in DirectoryType) {
      if (await this.storageService.has(SecureStorageKeys.directoryConfigPrefix + key)) {
        switch (+key) {
          case DirectoryType.Ldap:
            state.accounts[userId].directoryConfigurations.ldap =
              await this.storageService.get<LdapConfiguration>(
                SecureStorageKeys.directoryConfigPrefix + key
              );
            break;
          case DirectoryType.GSuite:
            state.accounts[userId].directoryConfigurations.gsuite =
              await this.storageService.get<GSuiteConfiguration>(
                SecureStorageKeys.directoryConfigPrefix + key
              );
            break;
          case DirectoryType.AzureActiveDirectory:
            state.accounts[userId].directoryConfigurations.azure =
              await this.storageService.get<AzureConfiguration>(
                SecureStorageKeys.directoryConfigPrefix + key
              );
            break;
          case DirectoryType.Okta:
            state.accounts[userId].directoryConfigurations.okta =
              await this.storageService.get<OktaConfiguration>(
                SecureStorageKeys.directoryConfigPrefix + key
              );
            break;
          case DirectoryType.OneLogin:
            state.accounts[userId].directoryConfigurations.oneLogin =
              await this.storageService.get<OneLoginConfiguration>(
                SecureStorageKeys.directoryConfigPrefix + key
              );
            break;
        }
        await this.storageService.remove(SecureStorageKeys.directoryConfigPrefix + key);
      }
    }

    state.globals.environmentUrls = await this.storageService.get("environmentUrls");

    await this.storageService.save("state", state);

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
}
