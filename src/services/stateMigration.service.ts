import { State } from 'jslib-common/models/domain/state';

import { StateMigrationService as BaseStateMigrationService } from 'jslib-common/services/stateMigration.service';

import { DirectoryType } from 'src/enums/directoryType';

import { Account } from 'src/models/account';
import { AzureConfiguration } from 'src/models/azureConfiguration';
import { GSuiteConfiguration } from 'src/models/gsuiteConfiguration';
import { LdapConfiguration } from 'src/models/ldapConfiguration';
import { OktaConfiguration } from 'src/models/oktaConfiguration';
import { OneLoginConfiguration } from 'src/models/oneLoginConfiguration';

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
    lastUserSync: 'lastUserSync',
    lastGroupSync: 'lastGroupSync',
    lastSyncHash: 'lastSyncHash',
    organizationId: 'organizationId',
};

export class StateMigrationService extends BaseStateMigrationService {
    protected async migrateStateFrom1to2(
        useSecureStorageForSecrets: boolean = true
    ): Promise<void> {
        await super.migrateStateFrom1To2();
        const state = await this.storageService.get<State<Account>>('state');
        const userId = await this.storageService.get<string>('userId');

        for (const key in DirectoryType) {
            if (await this.storageService.has(Keys.directoryConfigPrefix + key)) {
                switch (key) {
                   case DirectoryType[DirectoryType.Ldap]:
                        state.accounts[userId].directoryConfigurations.ldap =
                            await this.storageService.get<LdapConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                   case DirectoryType[DirectoryType.GSuite]:
                        state.accounts[userId].directoryConfigurations.gsuite =
                            await this.storageService.get<GSuiteConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                   case DirectoryType[DirectoryType.AzureActiveDirectory]:
                        state.accounts[userId].directoryConfigurations.azure =
                            await this.storageService.get<AzureConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                   case DirectoryType[DirectoryType.Okta]:
                        state.accounts[userId].directoryConfigurations.okta =
                            await this.storageService.get<OktaConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                   case DirectoryType[DirectoryType.OneLogin]:
                        state.accounts[userId].directoryConfigurations.oneLogin =
                            await this.storageService.get<OneLoginConfiguration>(Keys.directoryConfigPrefix + key);
                        break;
                }
                await this.storageService.remove(Keys.directoryConfigPrefix + key);
            }
        }

        if (useSecureStorageForSecrets) {
            for (const key in Keys) {
                if (await this.secureStorageService.has(key)) {
                    await this.secureStorageService.save(
                        `${userId}_${key}`,
                        await this.secureStorageService.get(key)
                    );
                    await this.secureStorageService.remove(key);
                }
            }
        }
    }
}
