import { DirectoryType } from '../enums/directoryType';

import { StorageService } from 'jslib/abstractions/storage.service';

const StoredSecurely = '[STORED SECURELY]';
const Keys = {
    ldap: 'ldapPassword',
    gsuite: 'gsuitePrivateKey',
    azure: 'azureKey',
    directoryConfigPrefix: 'directoryConfig_',
};

export class ConfigurationService {
    constructor(private storageService: StorageService, private secureStorageService: StorageService) { }

    async get<T>(type: DirectoryType): Promise<T> {
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

    async save<T>(type: DirectoryType, config: T): Promise<any> {
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
                    await this.secureStorageService.save(Keys.gsuite, savedConfig.privateKey);
                    savedConfig.privateKey = StoredSecurely;
                }
                break;
        }
        await this.storageService.save(Keys.directoryConfigPrefix + type, savedConfig);
    }
}
