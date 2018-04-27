import { DirectoryType } from '../enums/directoryType';

import { StorageService } from 'jslib/abstractions/storage.service';
import { AzureConfiguration } from '../models/azureConfiguration';
import { GSuiteConfiguration } from '../models/gsuiteConfiguration';
import { LdapConfiguration } from '../models/ldapConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';

const StoredSecurely = '[STORED SECURELY]';
const Keys = {
    ldap: 'ldapPassword',
    gsuite: 'gsuitePrivateKey',
    azure: 'azureKey',
    directoryConfigPrefix: 'directoryConfig_',
    sync: 'syncConfig',
    directoryType: 'directoryType',
};

export class ConfigurationService {
    constructor(private storageService: StorageService, private secureStorageService: StorageService) { }

    async getDirectory<T>(type: DirectoryType): Promise<T> {
        const config = await this.storageService.get<T>(Keys.directoryConfigPrefix + type);
        if (config == null) {
            return config;
        }

        switch (type) {
            case DirectoryType.Ldap:
                (config as any).password = await this.secureStorageService.get<string>(Keys.ldap);
                break;
            case DirectoryType.AzureActiveDirectory:
                (config as any).key = await this.secureStorageService.get<string>(Keys.azure);
                break;
            case DirectoryType.GSuite:
                (config as any).privateKey = await this.secureStorageService.get<string>(Keys.gsuite);
                break;
        }
        return config;
    }

    async saveDirectory(type: DirectoryType,
        config: LdapConfiguration | GSuiteConfiguration | AzureConfiguration): Promise<any> {
        const savedConfig: any = Object.assign({}, config);
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
            case DirectoryType.GSuite:
                if (savedConfig.privateKey == null) {
                    await this.secureStorageService.remove(Keys.gsuite);
                } else {
                    (config as any).privateKey = savedConfig.privateKey =
                        savedConfig.privateKey.replace(/\\n/g, '\n');
                    await this.secureStorageService.save(Keys.gsuite, savedConfig.privateKey);
                    savedConfig.privateKey = StoredSecurely;
                }
                break;
        }
        await this.storageService.save(Keys.directoryConfigPrefix + type, savedConfig);
    }

    async getSync(): Promise<SyncConfiguration> {
        return this.storageService.get<SyncConfiguration>(Keys.sync);
    }

    async saveSync(config: SyncConfiguration) {
        return this.storageService.save(Keys.sync, config);
    }

    async getDirectoryType(): Promise<DirectoryType> {
        return this.storageService.get<DirectoryType>(Keys.directoryType);
    }

    async saveDirectoryType(type: DirectoryType) {
        return this.storageService.save(Keys.directoryType, type);
    }
}
