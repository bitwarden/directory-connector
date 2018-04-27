import { DirectoryType } from '../enums/directoryType';

import { StorageService } from 'jslib/abstractions/storage.service';

import { AzureDirectoryService } from './azure-directory.service';
import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';
import { GSuiteDirectoryService } from './gsuite-directory.service';
import { LdapDirectoryService } from './ldap-directory.service';

const Keys = {
};

export class SyncService {
    private dirType: DirectoryType;

    constructor(private configurationService: ConfigurationService) { }

    async sync(force = true, sendToServer = true): Promise<any> {
        this.dirType = await this.configurationService.getDirectoryType();
        if (this.dirType == null) {
            return;
        }

        const directoryService = this.getDirectoryService();
        if (directoryService == null) {
            return;
        }

        directoryService.getEntries(force);
    }

    private getDirectoryService(): DirectoryService {
        switch (this.dirType) {
            case DirectoryType.GSuite:
                return new GSuiteDirectoryService(this.configurationService);
            case DirectoryType.AzureActiveDirectory:
                return new AzureDirectoryService(this.configurationService);
            case DirectoryType.Ldap:
                return new LdapDirectoryService(this.configurationService);
            default:
                return null;
        }
    }
}
