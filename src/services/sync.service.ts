import { DirectoryType } from '../enums/directoryType';

import { GroupEntry } from '../models/groupEntry';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { ImportDirectoryRequest } from 'jslib/models/request/importDirectoryRequest';
import { ImportDirectoryRequestGroup } from 'jslib/models/request/importDirectoryRequestGroup';
import { ImportDirectoryRequestUser } from 'jslib/models/request/importDirectoryRequestUser';

import { ApiService } from 'jslib/abstractions/api.service';
import { CryptoFunctionService } from 'jslib/abstractions/cryptoFunction.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { LogService } from 'jslib/abstractions/log.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';

import { Utils } from 'jslib/misc/utils';

import { AzureDirectoryService } from './azure-directory.service';
import { ConfigurationService } from './configuration.service';
import { IDirectoryService } from './directory.service';
import { GSuiteDirectoryService } from './gsuite-directory.service';
import { LdapDirectoryService } from './ldap-directory.service';
import { OktaDirectoryService } from './okta-directory.service';
import { OneLoginDirectoryService } from './onelogin-directory.service';

export class SyncService {
    private dirType: DirectoryType;

    constructor(private configurationService: ConfigurationService, private logService: LogService,
        private cryptoFunctionService: CryptoFunctionService, private apiService: ApiService,
        private messagingService: MessagingService, private i18nService: I18nService) { }

    async sync(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
        this.dirType = await this.configurationService.getDirectoryType();
        if (this.dirType == null) {
            throw new Error('No directory configured.');
        }

        const directoryService = this.getDirectoryService();
        if (directoryService == null) {
            throw new Error('Cannot load directory service.');
        }

        const syncConfig = await this.configurationService.getSync();
        const startingGroupDelta = await this.configurationService.getGroupDeltaToken();
        const startingUserDelta = await this.configurationService.getUserDeltaToken();
        const now = new Date();

        this.messagingService.send('dirSyncStarted');
        try {
            const entries = await directoryService.getEntries(force || syncConfig.overwriteExisting, test);
            let groups = entries[0];
            let users = this.filterUnsupportedUsers(entries[1]);

            if (groups != null && groups.length > 0) {
                this.flattenUsersToGroups(groups, groups);
            }

            if (test || (!syncConfig.overwriteExisting &&
                        (groups == null || groups.length === 0) && (users == null || users.length === 0))) {
                if (!test) {
                    await this.saveSyncTimes(syncConfig, now);
                }

                this.messagingService.send('dirSyncCompleted', { successfully: true });
                return [groups, users];
            }

            const req = this.buildRequest(groups, users, syncConfig.removeDisabled, syncConfig.overwriteExisting);
            const reqJson = JSON.stringify(req);

            let hash: string = null;
            const hashBuf = await this.cryptoFunctionService.hash(this.apiService.apiBaseUrl + reqJson, 'sha256');
            if (hashBuf != null) {
                hash = Utils.fromBufferToB64(hashBuf);
            }
            const lastHash = await this.configurationService.getLastSyncHash();

            if (lastHash == null || hash !== lastHash) {
                const orgId = await this.configurationService.getOrganizationId();
                if (orgId == null) {
                    throw new Error('Organization not set.');
                }

                await this.apiService.postImportDirectory(orgId, req);
                await this.configurationService.saveLastSyncHash(hash);
            } else {
                groups = null;
                users = null;
            }

            await this.saveSyncTimes(syncConfig, now);
            this.messagingService.send('dirSyncCompleted', { successfully: true });
            return [groups, users];
        } catch (e) {
            if (!test) {
                await this.configurationService.saveGroupDeltaToken(startingGroupDelta);
                await this.configurationService.saveUserDeltaToken(startingUserDelta);
            }

            this.messagingService.send('dirSyncCompleted', { successfully: false });
            throw e;
        }
    }

    private filterUnsupportedUsers(users: UserEntry[]): UserEntry[] {
        return users == null ? null : users.filter(u => u.email?.length <= 256);
    }

    private flattenUsersToGroups(levelGroups: GroupEntry[], allGroups: GroupEntry[]): Set<string> {
        let allUsers = new Set<string>();
        if (allGroups == null) {
            return allUsers;
        }
        for (const group of levelGroups) {
            const childGroups = allGroups.filter(g => group.groupMemberReferenceIds.has(g.referenceId));
            const childUsers = this.flattenUsersToGroups(childGroups, allGroups);
            childUsers.forEach(id => group.userMemberExternalIds.add(id));
            allUsers = new Set([...allUsers, ...group.userMemberExternalIds]);
        }
        return allUsers;
    }

    private getDirectoryService(): IDirectoryService {
        switch (this.dirType) {
            case DirectoryType.GSuite:
                return new GSuiteDirectoryService(this.configurationService, this.logService, this.i18nService);
            case DirectoryType.AzureActiveDirectory:
                return new AzureDirectoryService(this.configurationService, this.logService, this.i18nService);
            case DirectoryType.Ldap:
                return new LdapDirectoryService(this.configurationService, this.logService, this.i18nService);
            case DirectoryType.Okta:
                return new OktaDirectoryService(this.configurationService, this.logService, this.i18nService);
            case DirectoryType.OneLogin:
                return new OneLoginDirectoryService(this.configurationService, this.logService, this.i18nService);
            default:
                return null;
        }
    }

    private buildRequest(groups: GroupEntry[], users: UserEntry[], removeDisabled: boolean,
        overwriteExisting: boolean): ImportDirectoryRequest {
        const model = new ImportDirectoryRequest();
        model.overwriteExisting = overwriteExisting;

        if (groups != null) {
            for (const g of groups) {
                const ig = new ImportDirectoryRequestGroup();
                ig.name = g.name;
                ig.externalId = g.externalId;
                ig.users = Array.from(g.userMemberExternalIds);
                model.groups.push(ig);
            }
        }

        if (users != null) {
            for (const u of users) {
                const iu = new ImportDirectoryRequestUser();
                iu.email = u.email;
                if (iu.email != null) {
                    iu.email = iu.email.trim().toLowerCase();
                }
                iu.externalId = u.externalId;
                iu.deleted = u.deleted || (removeDisabled && u.disabled);
                model.users.push(iu);
            }
        }

        return model;
    }

    private async saveSyncTimes(syncConfig: SyncConfiguration, time: Date) {
        if (syncConfig.groups) {
            await this.configurationService.saveLastGroupSyncDate(time);
        }
        if (syncConfig.users) {
            await this.configurationService.saveLastUserSyncDate(time);
        }
    }
}
