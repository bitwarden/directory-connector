import { HtmlStorageLocation } from 'jslib-common/enums/htmlStorageLocation';
import { State } from 'jslib-common/models/domain/state';

import { StateMigrationService as BaseStateMigrationService } from 'jslib-common/services/stateMigration.service';

import { DirectoryType } from 'src/enums/directoryType';

import { Account, DirectoryConfigurations, DirectorySettings } from 'src/models/account';
import { AzureConfiguration } from 'src/models/azureConfiguration';
import { GSuiteConfiguration } from 'src/models/gsuiteConfiguration';
import { LdapConfiguration } from 'src/models/ldapConfiguration';
import { OktaConfiguration } from 'src/models/oktaConfiguration';
import { OneLoginConfiguration } from 'src/models/oneLoginConfiguration';
import { SyncConfiguration } from 'src/models/syncConfiguration';

const Keys = {
    ldap: 'ldapPassword',
    gsuite: 'gsuitePrivateKey',
    azure: 'azureKey',
    okta: 'oktaToken',
    oneLogin: 'oneLoginClientSecret',
    directoryConfigPrefix: 'directoryConfig_',
    sync: 'syncConfig',
    directoryType: 'directoryType',
    userDelta: 'userDeltaToken',
    groupDelta: 'groupDeltaToken',
    organizationId: 'organizationId',
};

const ClientKeys = {
    clientIdOld: 'clientId',
    clientId: 'apikey_clientId',
    clientSecretOld: 'clientSecret',
    clientSecret: 'apikey_clientSecret',
};

export class StateMigrationService extends BaseStateMigrationService {
    async needsMigration(): Promise<boolean> {
        const currentStateVersion = (
        await this.storageService.get<State<Account>>('state', {
            htmlStorageLocation: HtmlStorageLocation.Local,
        })
        )?.globals?.stateVersion;
        return currentStateVersion == null || currentStateVersion < this.latestVersion;
    }

    async migrate(): Promise<void> {
        let currentStateVersion =
            (await this.storageService.get<State<Account>>('state'))?.globals?.stateVersion ?? 1;
        while (currentStateVersion < this.latestVersion) {
        switch (currentStateVersion) {
            case 1:
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

    protected async migrateStateFrom1To2(
        useSecureStorageForSecrets: boolean = true
    ): Promise<void> {
        await super.migrateStateFrom1To2();
        const state = await this.storageService.get<State<Account>>('state');
        const userId = await this.storageService.get<string>(ClientKeys.clientId);

        if (userId != null) {
            state.accounts[userId] = new Account({
                directorySettings: {
                    directoryType: await this.storageService.get<DirectoryType>('directoryType'),
                    organizationId: await this.storageService.get<string>('organizationId'),
                    lastUserSync: await this.storageService.get<Date>('lastUserSync'),
                    lastGroupSync: await this.storageService.get<Date>('lastGroupSync'),
                    lastSyncHash: await this.storageService.get<string>('lastSyncHash'),
                    syncingDir: await this.storageService.get<boolean>('syncingDir'),
                    sync: await this.storageService.get<SyncConfiguration>('syncConfig'),
                },
                profile: {
                    entityId: await this.storageService.get<string>('entityId'),
                },
                directoryConfigurations: new DirectoryConfigurations(),
            });
        }

        for (const key in DirectoryType) {
            if (await this.storageService.has(Keys.directoryConfigPrefix + key)) {
                switch (+key) {
                   case DirectoryType.Ldap:
                        state.accounts[userId].directoryConfigurations.ldap =
                            await this.storageService.get<LdapConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                   case DirectoryType.GSuite:
                        state.accounts[userId].directoryConfigurations.gsuite =
                            await this.storageService.get<GSuiteConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                   case DirectoryType.AzureActiveDirectory:
                        state.accounts[userId].directoryConfigurations.azure =
                            await this.storageService.get<AzureConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                   case DirectoryType.Okta:
                        state.accounts[userId].directoryConfigurations.okta =
                            await this.storageService.get<OktaConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                   case DirectoryType.OneLogin:
                        state.accounts[userId].directoryConfigurations.oneLogin =
                            await this.storageService.get<OneLoginConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                }
                await this.storageService.remove(Keys.directoryConfigPrefix + key);
            }
        }

        state.globals.environmentUrls = await this.storageService.get('environmentUrls');

        await this.storageService.save('state', state);

        if (useSecureStorageForSecrets) {
            for (const key in Keys) {
                if (await this.secureStorageService.has(Keys[key])) {
                    await this.secureStorageService.save(
                        `${userId}_${Keys[key]}`,
                        await this.secureStorageService.get(Keys[key])
                    );
                    await this.secureStorageService.remove(Keys[key]);
                }
            }
        }
    }
}
