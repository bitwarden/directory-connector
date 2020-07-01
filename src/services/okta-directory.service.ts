import { DirectoryType } from '../enums/directoryType';

import { GroupEntry } from '../models/groupEntry';
import { OktaConfiguration } from '../models/oktaConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { BaseDirectoryService } from './baseDirectory.service';
import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';

import { I18nService } from 'jslib/abstractions/i18n.service';
import { LogService } from 'jslib/abstractions/log.service';

// tslint:disable-next-line
const okta = require('@okta/okta-sdk-nodejs');

export class OktaDirectoryService extends BaseDirectoryService implements DirectoryService {
    private dirConfig: OktaConfiguration;
    private syncConfig: SyncConfiguration;
    private client: any;

    constructor(private configurationService: ConfigurationService, private logService: LogService,
        private i18nService: I18nService) {
        super();
    }

    async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
        const type = await this.configurationService.getDirectoryType();
        if (type !== DirectoryType.Okta) {
            return;
        }

        this.dirConfig = await this.configurationService.getDirectory<OktaConfiguration>(DirectoryType.Okta);
        if (this.dirConfig == null) {
            return;
        }

        this.syncConfig = await this.configurationService.getSync();
        if (this.syncConfig == null) {
            return;
        }

        if (this.dirConfig.orgUrl == null || this.dirConfig.token == null) {
            throw new Error(this.i18nService.t('dirConfigIncomplete'));
        }

        this.client = new okta.Client({
            orgUrl: this.dirConfig.orgUrl,
            token: this.dirConfig.token,
        });

        let users: UserEntry[];
        if (this.syncConfig.users) {
            users = await this.getUsers(force);
        }

        let groups: GroupEntry[];
        if (this.syncConfig.groups) {
            const setFilter = this.createCustomSet(this.syncConfig.groupFilter);
            groups = await this.getGroups(this.forceGroup(force, users), setFilter);
            users = this.filterUsersFromGroupsSet(users, groups, setFilter, this.syncConfig);
        }

        return [groups, users];
    }

    private async getUsers(force: boolean): Promise<UserEntry[]> {
        const entries: UserEntry[] = [];
        const lastSync = await this.configurationService.getLastUserSyncDate();
        const oktaFilter = this.buildOktaFilter(this.syncConfig.userFilter, force, lastSync);
        const setFilter = this.createCustomSet(this.syncConfig.userFilter);

        this.logService.info('Querying users.');
        const usersPromise = this.client.listUsers({ filter: oktaFilter }).each((user: any) => {
            const entry = this.buildUser(user);
            if (entry != null && !this.filterOutResult(setFilter, entry.email)) {
                entries.push(entry);
            }
        });

        // Deactivated users have to be queried for separately, only when no filter is provided in the first query
        let deactUsersPromise: any;
        if (oktaFilter == null || oktaFilter.indexOf('lastUpdated ') === -1) {
            let deactOktaFilter = 'status eq "DEPROVISIONED"';
            if (oktaFilter != null) {
                deactOktaFilter = '(' + oktaFilter + ') and ' + deactOktaFilter;
            }
            deactUsersPromise = this.client.listUsers({ filter: deactOktaFilter }).each((user: any) => {
                const entry = this.buildUser(user);
                if (entry != null && !this.filterOutResult(setFilter, entry.email)) {
                    entries.push(entry);
                }
            });
        } else {
            deactUsersPromise = Promise.resolve();
        }

        await Promise.all([usersPromise, deactUsersPromise]);
        return entries;
    }

    private buildUser(user: any) {
        const entry = new UserEntry();
        entry.externalId = user.id;
        entry.referenceId = user.id;
        entry.email = user.profile.email != null ? user.profile.email.trim().toLowerCase() : null;
        entry.deleted = user.status === 'DEPROVISIONED';
        entry.disabled = user.status === 'SUSPENDED';
        return entry;
    }

    private async getGroups(force: boolean, setFilter: [boolean, Set<string>]): Promise<GroupEntry[]> {
        const entries: GroupEntry[] = [];
        const lastSync = await this.configurationService.getLastGroupSyncDate();
        const oktaFilter = this.buildOktaFilter(this.syncConfig.groupFilter, force, lastSync);

        this.logService.info('Querying groups.');
        await this.client.listGroups({ filter: oktaFilter }).each(async (group: any) => {
            const entry = await this.buildGroup(group);
            if (entry != null && !this.filterOutResult(setFilter, entry.name)) {
                entries.push(entry);
            }
        });
        return entries;
    }

    private async buildGroup(group: any): Promise<GroupEntry> {
        const entry = new GroupEntry();
        entry.externalId = group.id;
        entry.referenceId = group.id;
        entry.name = group.profile.name;

        await this.client.listGroupUsers(group.id).each((user: any) => {
            entry.userMemberExternalIds.add(user.id);
        });

        return entry;
    }

    private buildOktaFilter(baseFilter: string, force: boolean, lastSync: Date) {
        baseFilter = this.createDirectoryQuery(baseFilter);
        baseFilter = baseFilter == null || baseFilter.trim() === '' ? null : baseFilter;
        if (force || lastSync == null) {
            return baseFilter;
        }

        const updatedFilter = 'lastUpdated gt "' + lastSync.toISOString() + '"';
        if (baseFilter == null) {
            return updatedFilter;
        }

        return '(' + baseFilter + ') and ' + updatedFilter;
    }
}
