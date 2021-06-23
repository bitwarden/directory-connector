import { DirectoryType } from '../enums/directoryType';

import { StorageService } from 'jslib-common/abstractions/storage.service';
import { AzureConfiguration } from '../models/azureConfiguration';
import { GSuiteConfiguration } from '../models/gsuiteConfiguration';
import { LdapConfiguration } from '../models/ldapConfiguration';
import { OktaConfiguration } from '../models/oktaConfiguration';
import { OneLoginConfiguration } from '../models/oneLoginConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';

const StoredSecurely = '[STORED SECURELY]';
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

export class ConfigurationService {
    constructor(private storageService: StorageService, private secureStorageService: StorageService,
        private useSecureStorageForSecrets = true) { }

    async getDirectory<T>(type: DirectoryType): Promise<T> {
        const config = await this.storageService.get<T>(Keys.directoryConfigPrefix + type);
        if (config == null) {
            return config;
        }

        if (this.useSecureStorageForSecrets) {
            switch (type) {
                case DirectoryType.Ldap:
                    (config as any).password = await this.secureStorageService.get<string>(Keys.ldap);
                    break;
                case DirectoryType.AzureActiveDirectory:
                    (config as any).key = await this.secureStorageService.get<string>(Keys.azure);
                    break;
                case DirectoryType.Okta:
                    (config as any).token = await this.secureStorageService.get<string>(Keys.okta);
                    break;
                case DirectoryType.GSuite:
                    (config as any).privateKey = await this.secureStorageService.get<string>(Keys.gsuite);
                    break;
                case DirectoryType.OneLogin:
                    (config as any).clientSecret = await this.secureStorageService.get<string>(Keys.oneLogin);
                    break;
            }
        }
        return config;
    }

    async saveDirectory(type: DirectoryType,
        config: LdapConfiguration | GSuiteConfiguration | AzureConfiguration | OktaConfiguration |
            OneLoginConfiguration): Promise<any> {
        const savedConfig: any = Object.assign({}, config);
        if (this.useSecureStorageForSecrets) {
            switch (type) {
                case DirectoryType.Ldap:
                    if (savedConfig.password == null) {
                        await this.secureStorageService.remove(Keys.ldap);
                    } else {
                        await this.secureStorageService.save(Keys.ldap, savedConfig.password);
                        savedConfig.password = StoredSecurely;
                    }
                    break;
                case DirectoryType.AzureActiveDirectory:
                    if (savedConfig.key == null) {
                        await this.secureStorageService.remove(Keys.azure);
                    } else {
                        await this.secureStorageService.save(Keys.azure, savedConfig.key);
                        savedConfig.key = StoredSecurely;
                    }
                    break;
                case DirectoryType.Okta:
                    if (savedConfig.token == null) {
                        await this.secureStorageService.remove(Keys.okta);
                    } else {
                        await this.secureStorageService.save(Keys.okta, savedConfig.token);
                        savedConfig.token = StoredSecurely;
                    }
                    break;
                case DirectoryType.GSuite:
                    if (savedConfig.privateKey == null) {
                        await this.secureStorageService.remove(Keys.gsuite);
                    } else {
                        (config as GSuiteConfiguration).privateKey = savedConfig.privateKey =
                            savedConfig.privateKey.replace(/\\n/g, '\n');
                        await this.secureStorageService.save(Keys.gsuite, savedConfig.privateKey);
                        savedConfig.privateKey = StoredSecurely;
                    }
                    break;
                case DirectoryType.OneLogin:
                    if (savedConfig.clientSecret == null) {
                        await this.secureStorageService.remove(Keys.oneLogin);
                    } else {
                        await this.secureStorageService.save(Keys.oneLogin, savedConfig.clientSecret);
                        savedConfig.clientSecret = StoredSecurely;
                    }
                    break;
            }
        }
        await this.storageService.save(Keys.directoryConfigPrefix + type, savedConfig);
    }

    getSync(): Promise<SyncConfiguration> {
        return this.storageService.get<SyncConfiguration>(Keys.sync);
    }

    saveSync(config: SyncConfiguration) {
        return this.storageService.save(Keys.sync, config);
    }

    getDirectoryType(): Promise<DirectoryType> {
        return this.storageService.get<DirectoryType>(Keys.directoryType);
    }

    async saveDirectoryType(type: DirectoryType) {
        const currentType = await this.getDirectoryType();
        if (type !== currentType) {
            await this.clearStatefulSettings();
        }

        return this.storageService.save(Keys.directoryType, type);
    }

    getUserDeltaToken(): Promise<string> {
        return this.storageService.get<string>(Keys.userDelta);
    }

    saveUserDeltaToken(token: string) {
        if (token == null) {
            return this.storageService.remove(Keys.userDelta);
        } else {
            return this.storageService.save(Keys.userDelta, token);
        }
    }

    getGroupDeltaToken(): Promise<string> {
        return this.storageService.get<string>(Keys.groupDelta);
    }

    saveGroupDeltaToken(token: string) {
        if (token == null) {
            return this.storageService.remove(Keys.groupDelta);
        } else {
            return this.storageService.save(Keys.groupDelta, token);
        }
    }

    async getLastUserSyncDate(): Promise<Date> {
        const dateString = await this.storageService.get<string>(Keys.lastUserSync);
        if (dateString == null) {
            return null;
        }
        return new Date(dateString);
    }

    saveLastUserSyncDate(date: Date) {
        if (date == null) {
            return this.storageService.remove(Keys.lastUserSync);
        } else {
            return this.storageService.save(Keys.lastUserSync, date);
        }
    }

    async getLastGroupSyncDate(): Promise<Date> {
        const dateString = await this.storageService.get<string>(Keys.lastGroupSync);
        if (dateString == null) {
            return null;
        }
        return new Date(dateString);
    }

    saveLastGroupSyncDate(date: Date) {
        if (date == null) {
            return this.storageService.remove(Keys.lastGroupSync);
        } else {
            return this.storageService.save(Keys.lastGroupSync, date);
        }
    }

    getLastSyncHash(): Promise<string> {
        return this.storageService.get<string>(Keys.lastSyncHash);
    }

    saveLastSyncHash(hash: string) {
        if (hash == null) {
            return this.storageService.remove(Keys.lastSyncHash);
        } else {
            return this.storageService.save(Keys.lastSyncHash, hash);
        }
    }

    getOrganizationId(): Promise<string> {
        return this.storageService.get<string>(Keys.organizationId);
    }

    async saveOrganizationId(id: string) {
        const currentId = await this.getOrganizationId();
        if (currentId !== id) {
            await this.clearStatefulSettings();
        }

        if (id == null) {
            return this.storageService.remove(Keys.organizationId);
        } else {
            return this.storageService.save(Keys.organizationId, id);
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
