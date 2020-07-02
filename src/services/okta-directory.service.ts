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

import * as bent from 'bent';

export class OktaDirectoryService extends BaseDirectoryService implements DirectoryService {
    private dirConfig: OktaConfiguration;
    private syncConfig: SyncConfiguration;

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
        const usersPromise = this.apiGetMany('users?filter=' + this.encodeUrlParameter(oktaFilter))
            .then((users: any[]) => {
                for (const user of users) {
                    const entry = this.buildUser(user);
                    if (entry != null && !this.filterOutResult(setFilter, entry.email)) {
                        entries.push(entry);
                    }
                }
            });

        // Deactivated users have to be queried for separately, only when no filter is provided in the first query
        let deactUsersPromise: any;
        if (oktaFilter == null || oktaFilter.indexOf('lastUpdated ') === -1) {
            let deactOktaFilter = 'status eq "DEPROVISIONED"';
            if (oktaFilter != null) {
                deactOktaFilter = '(' + oktaFilter + ') and ' + deactOktaFilter;
            }
            deactUsersPromise = this.apiGetMany('users?filter=' + this.encodeUrlParameter(deactOktaFilter))
                .then((users: any[]) => {
                    for (const user of users) {
                        const entry = this.buildUser(user);
                        if (entry != null && !this.filterOutResult(setFilter, entry.email)) {
                            entries.push(entry);
                        }
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
        await this.apiGetMany('groups?filter=' + this.encodeUrlParameter(oktaFilter)).then(async (groups: any[]) => {
            for (const group of groups) {
                const entry = await this.buildGroup(group);
                if (entry != null && !this.filterOutResult(setFilter, entry.name)) {
                    entries.push(entry);
                }
            }
        });
        return entries;
    }

    private async buildGroup(group: any): Promise<GroupEntry> {
        const entry = new GroupEntry();
        entry.externalId = group.id;
        entry.referenceId = group.id;
        entry.name = group.profile.name;

        await this.apiGetMany('groups/' + group.id + '/users').then((users: any[]) => {
            for (const user of users) {
                entry.userMemberExternalIds.add(user.id);
            }
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

    private encodeUrlParameter(filter: string): string {
        return filter == null ? '' : encodeURIComponent(filter);
    }

    /*
    private async apiGetCall(url: string): Promise<[any, fe.Headers]> {
        const req: fe.RequestInit = {
            method: 'GET',
            headers: new fe.Headers({
                'Authorization': 'SSWS ' + this.dirConfig.token,
                'Accept': 'application/json',
            }),
        };
        const response = await fe.default(new fe.Request(url, req));
        if (response.status === 200) {
            const responseJson = await response.json();
            return [responseJson, response.headers];
        }
        return null;
    }
    */

    private async apiGetCall(url: string): Promise<[any, Map<string, string>]> {
        let baseUrl: string = null;
        let endpoint: string = null;
        if (url.indexOf('https://') > -1) {
            const parts = url.split('/api/v1/');
            if (parts.length > 1) {
                baseUrl = parts[0] + '/api/v1/';
                endpoint = parts[1];
            }
        }
        const getReq = bent(baseUrl);
        const response: any = await getReq(endpoint, null, { Authorization: 'SSWS ' + this.dirConfig.token });
        if (response.status === 200) {
            const responseJson = await response.json();
            if (response.headers != null) {
                const headersMap = new Map<string, string>();
                for (const key in response.headers) {
                    if (response.headers.hasOwnProperty(key)) {
                        const val = response.headers[key];
                        headersMap.set(key.toLowerCase(), val);
                    }
                }
                return [responseJson, headersMap];
            }
            return [responseJson, null];
        }
        return null;
    }

    private async apiGetMany(endpoint: string, currentData: any[] = []): Promise<any[]> {
        const url = endpoint.indexOf('https://') === 0 ? endpoint : `${this.dirConfig.orgUrl}/api/v1/${endpoint}`;
        const response = await this.apiGetCall(url);
        if (response == null || response[0] == null || !Array.isArray(response[0])) {
            throw new Error('API call failed.');
        }
        if (response[0].length === 0) {
            return currentData;
        }
        currentData = currentData.concat(response[0]);
        if (response[1] == null) {
            return currentData;
        }
        const linkHeader = response[1].get('link');
        if (linkHeader == null) {
            return currentData;
        }
        let nextLink: string = null;
        const linkHeaderParts = linkHeader.split(',');
        for (const part of linkHeaderParts) {
            if (part.indexOf('; rel="next"') > -1) {
                const subParts = part.split(';');
                if (subParts.length > 0 && subParts[0].indexOf('https://') > -1) {
                    nextLink = subParts[0].replace('>', '').replace('<', '').trim();
                    break;
                }
            }
        }
        if (nextLink == null) {
            return currentData;
        }
        return this.apiGetMany(nextLink, currentData);
    }
}
