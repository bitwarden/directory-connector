import { DirectoryType } from '../enums/directoryType';

import { GroupEntry } from '../models/groupEntry';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { OrganizationImportRequest } from 'jslib-common/models/request/organizationImportRequest';

import { ApiService } from 'jslib-common/abstractions/api.service';
import { CryptoFunctionService } from 'jslib-common/abstractions/cryptoFunction.service';
import { EnvironmentService } from 'jslib-common/abstractions/environment.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { LogService } from 'jslib-common/abstractions/log.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';

import { Utils } from 'jslib-common/misc/utils';

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
        private messagingService: MessagingService, private i18nService: I18nService,
        private environmentService: EnvironmentService) { }

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

            users = this.removeDuplicateUsers(users);

            if (test || (!syncConfig.overwriteExisting &&
                (groups == null || groups.length === 0) && (users == null || users.length === 0))) {
                if (!test) {
                    await this.saveSyncTimes(syncConfig, now);
                }

                this.messagingService.send('dirSyncCompleted', { successfully: true });
                return [groups, users];
            }

            const req = this.buildRequest(groups, users, syncConfig.removeDisabled, syncConfig.overwriteExisting, syncConfig.largeImport);
            const reqJson = JSON.stringify(req);

            const orgId = await this.configurationService.getOrganizationId();
            if (orgId == null) {
                throw new Error('Organization not set.');
            }

            // TODO: Remove hashLegacy once we're sure clients have had time to sync new hashes
            let hashLegacy: string = null;
            const hashBuffLegacy = await this.cryptoFunctionService.hash(this.environmentService.getApiUrl() + reqJson, 'sha256');
            if (hashBuffLegacy != null) {
                hashLegacy = Utils.fromBufferToB64(hashBuffLegacy);
            }
            let hash: string = null;
            const hashBuff = await this.cryptoFunctionService.hash(this.environmentService.getApiUrl() + orgId + reqJson, 'sha256');
            if (hashBuff != null) {
                hash = Utils.fromBufferToB64(hashBuff);
            }
            const lastHash = await this.configurationService.getLastSyncHash();

            if (lastHash == null || (hash !== lastHash && hashLegacy !== lastHash)) {
                await this.apiService.postPublicImportDirectory(req);
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

    private removeDuplicateUsers(users: UserEntry[]) {
        const uniqueUsers = new Array<UserEntry>();
        const processedUsers = new Map<string, string>();
        const duplicateEmails = new Array<string>();

        // UserEntrys with the same email and externalId are removed but otherwise ignored
        // UserEntrys with the same email but different externalIds will throw an error
        users.forEach(u => {
            if (processedUsers.has(u.email)) {
                if (u.externalId == null || processedUsers.get(u.email) != u.externalId) {
                    duplicateEmails.push(u.email);
                }
            } else {
                uniqueUsers.push(u);
                processedUsers.set(u.email, u.externalId);
            }
        });

        if (duplicateEmails.length > 0) {
            const emailsMessage = duplicateEmails.length < 4 ?
                duplicateEmails.join('\n') :
                duplicateEmails.slice(0, 3).join('\n') + '\n' + this.i18nService.t('andMore', `${duplicateEmails.length - 3}`);
            throw new Error(this.i18nService.t('duplicateEmails') + '\n' + emailsMessage);
        }

        return uniqueUsers;
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

    private buildRequest(groups: GroupEntry[], users: UserEntry[], removeDisabled: boolean, overwriteExisting: boolean,
        largeImport: boolean = false) {
        return new OrganizationImportRequest({
            groups: (groups ?? []).map(g => {
                return {
                    name: g.name,
                    externalId: g.externalId,
                    memberExternalIds: Array.from(g.userMemberExternalIds),
                };
            }),
            users: (users ?? []).map(u => {
                return {
                    email: u.email,
                    externalId: u.externalId,
                    deleted: u.deleted || (removeDisabled && u.disabled),
                };
            }),
            overwriteExisting: overwriteExisting,
            largeImport: largeImport,
        });
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
