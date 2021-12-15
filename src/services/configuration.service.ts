import { IConfiguration } from 'src/models/IConfiguration';
import { DirectoryType } from '../enums/directoryType';

import { AzureConfiguration } from '../models/azureConfiguration';
import { GSuiteConfiguration } from '../models/gsuiteConfiguration';
import { LdapConfiguration } from '../models/ldapConfiguration';
import { OktaConfiguration } from '../models/oktaConfiguration';
import { OneLoginConfiguration } from '../models/oneLoginConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';

import { StateService } from './state.service';

const StoredSecurely = '[STORED SECURELY]';

export class ConfigurationService {
    constructor(
        private stateService: StateService,
        private useSecureStorageForSecrets = true
    ) { }

    // TODO this type arguement and the type parameter passed in have an interdependency we need to refactor out
    async getDirectory<T extends IConfiguration>(type: DirectoryType): Promise<T> {
        const config = await this.stateService.getConfiguration(type);
        if (config == null) {
            return config as T;
        }

        if (this.useSecureStorageForSecrets) {
            switch (type) {
                case DirectoryType.Ldap:
                    (config as any).password = await this.stateService.getLdapKey();
                    break;
                case DirectoryType.AzureActiveDirectory:
                    (config as any).key = await this.stateService.getAzureKey();
                    break;
                case DirectoryType.Okta:
                    (config as any).token = await this.stateService.getOktaKey();
                    break;
                case DirectoryType.GSuite:
                    (config as any).privateKey = await this.stateService.getGsuiteKey();
                    break;
                case DirectoryType.OneLogin:
                    (config as any).clientSecret = await this.stateService.getOneLoginKey();
                    break;
            }
        }
        return config as T;
    }

    async saveDirectory(type: DirectoryType,
        config: LdapConfiguration | GSuiteConfiguration | AzureConfiguration | OktaConfiguration |
            OneLoginConfiguration): Promise<any> {
        const savedConfig: any = Object.assign({}, config);
        if (this.useSecureStorageForSecrets) {
            switch (type) {
                case DirectoryType.Ldap:
                    if (savedConfig.password == null) {
                        await this.stateService.setLdapKey(null);
                    } else {
                        await this.stateService.setLdapKey(savedConfig.password);
                        savedConfig.password = StoredSecurely;
                    }
                    await this.stateService.setLdapConfiguration(savedConfig);
                    break;
                case DirectoryType.AzureActiveDirectory:
                    if (savedConfig.key == null) {
                        await this.stateService.setAzureKey(null);
                    } else {
                        await this.stateService.setAzureKey(savedConfig.key);
                        savedConfig.key = StoredSecurely;
                    }
                    await this.stateService.setAzureConfiguration(savedConfig);
                    break;
                case DirectoryType.Okta:
                    if (savedConfig.token == null) {
                        await this.stateService.setOktaKey(null);
                    } else {
                        await this.stateService.setOktaKey(savedConfig.token);
                        savedConfig.token = StoredSecurely;
                    }
                    await this.stateService.setOktaConfiguration(savedConfig);
                    break;
                case DirectoryType.GSuite:
                    if (savedConfig.privateKey == null) {
                        await this.stateService.setGsuiteKey(null);
                    } else {
                        (config as GSuiteConfiguration).privateKey = savedConfig.privateKey =
                            savedConfig.privateKey.replace(/\\n/g, '\n');
                        await this.stateService.setGsuiteKey(savedConfig.privateKey);
                        savedConfig.privateKey = StoredSecurely;
                    }
                    await this.stateService.setGsuiteConfiguration(savedConfig);
                    break;
                case DirectoryType.OneLogin:
                    if (savedConfig.clientSecret == null) {
                        await this.stateService.setOneLoginKey(null);
                    } else {
                        await this.stateService.setOneLoginKey(savedConfig.clientSecret);
                        savedConfig.clientSecret = StoredSecurely;
                    }
                    await this.stateService.setOneLoginConfiguration(savedConfig);
                    break;
            }
        }
    }

    async getSync(): Promise<SyncConfiguration> {
        return await this.stateService.getSync();
    }

    async saveSync(config: SyncConfiguration): Promise<void> {
        return await this.stateService.setSync(config);
    }

    async getDirectoryType(): Promise<DirectoryType> {
        return await this.stateService.getDirectoryType();
    }

    async saveDirectoryType(type: DirectoryType): Promise<void> {
        const currentType = await this.getDirectoryType();
        if (type !== currentType) {
            await this.clearStatefulSettings();
        }

        return await this.stateService.setDirectoryType(type);
    }

    async getUserDeltaToken(): Promise<string> {
        return await this.stateService.getUserDelta();
    }

    async saveUserDeltaToken(token: string): Promise<void> {
        if (token == null) {
            return this.stateService.setUserDelta(null);
        } else {
            return this.stateService.setUserDelta(token);
        }
    }

    async getGroupDeltaToken(): Promise<string> {
        return await this.stateService.getGroupDelta();
    }

    async saveGroupDeltaToken(token: string): Promise<void> {
        if (token == null) {
            await this.stateService.setGroupDelta(null);
        } else {
            await this.stateService.setGroupDelta(token);
        }
    }

    async getLastUserSyncDate(): Promise<Date> {
        return await this.stateService.getLastUserSync();
    }

    async saveLastUserSyncDate(date: Date): Promise<void> {
        if (date == null) {
            return await this.stateService.setLastUserSync(null);
        } else {
            return await this.stateService.setLastUserSync(date);
        }
    }

    async getLastGroupSyncDate(): Promise<Date> {
        return await this.stateService.getLastGroupSync();
    }

    async saveLastGroupSyncDate(date: Date): Promise<void> {
        if (date == null) {
            await this.stateService.setLastGroupSync(null);
        } else {
            await this.stateService.setLastGroupSync(date);
        }
    }

    async getLastSyncHash(): Promise<string> {
        return await this.stateService.getLastSyncHash();
    }

    async saveLastSyncHash(hash: string): Promise<void> {
        if (hash == null) {
            await this.stateService.setLastSyncHash(null);
        } else {
            await this.stateService.setLastSyncHash(hash);
        }
    }

    async getOrganizationId(): Promise<string> {
        return await this.stateService.getOrganizationId();
    }

    async saveOrganizationId(id: string): Promise<void> {
        const currentId = await this.getOrganizationId();
        if (currentId !== id) {
            await this.clearStatefulSettings();
        }

        if (id == null) {
            await this.stateService.setOrganizationId(null);
        } else {
            await this.stateService.setOrganizationId(id);
        }
    }

    async clearStatefulSettings(hashToo = false) {
        await this.saveUserDeltaToken(null);
        await this.saveGroupDeltaToken(null);
        await this.saveLastGroupSyncDate(null);
        await this.saveLastUserSyncDate(null);
        if (hashToo) {
            await this.saveLastSyncHash(null);
        }
    }
}
