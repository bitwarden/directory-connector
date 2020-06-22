import { DirectoryType } from '../enums/directoryType';

import { GroupEntry } from '../models/groupEntry';
import { OneLoginConfiguration } from '../models/oneLoginConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { BaseDirectoryService } from './baseDirectory.service';
import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';

import { I18nService } from 'jslib/abstractions/i18n.service';
import { LogService } from 'jslib/abstractions/log.service';

// Basic email validation: something@something.something
const ValidEmailRegex = /^\S+@\S+\.\S+$/;

export class OneLoginDirectoryService extends BaseDirectoryService implements DirectoryService {
    private dirConfig: OneLoginConfiguration;
    private syncConfig: SyncConfiguration;
    private accessToken: string;
    private allUsers: any[] = [];

    constructor(private configurationService: ConfigurationService, private logService: LogService,
        private i18nService: I18nService) {
        super();
    }

    async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
        const type = await this.configurationService.getDirectoryType();
        if (type !== DirectoryType.OneLogin) {
            return;
        }

        this.dirConfig = await this.configurationService.getDirectory<OneLoginConfiguration>(DirectoryType.OneLogin);
        if (this.dirConfig == null) {
            return;
        }

        this.syncConfig = await this.configurationService.getSync();
        if (this.syncConfig == null) {
            return;
        }

        if (this.dirConfig.clientId == null || this.dirConfig.clientSecret == null) {
            throw new Error(this.i18nService.t('dirConfigIncomplete'));
        }

        this.accessToken = await this.getAccessToken();
        if (this.accessToken == null) {
            throw new Error('Could not get access token');
        }

        let users: UserEntry[];
        if (this.syncConfig.users) {
            users = await this.getUsers(force);
        }

        let groups: GroupEntry[];
        if (this.syncConfig.groups) {
            const setFilter = this.createCustomSet(this.syncConfig.groupFilter);
            groups = await this.getGroups(this.forceGroup(force, users), setFilter);
            users = this.filterUsersFromGroupsSet(users, groups, setFilter);
        }

        return [groups, users];
    }

    private async getUsers(force: boolean): Promise<UserEntry[]> {
        const entries: UserEntry[] = [];
        const query = this.createDirectoryQuery(this.syncConfig.userFilter);
        const setFilter = this.createCustomSet(this.syncConfig.userFilter);
        this.logService.info('Querying users.');
        this.allUsers = await this.apiGetMany('users' + (query != null ? '?' + query : ''));
        this.allUsers.forEach((user) => {
            const entry = this.buildUser(user);
            if (entry != null && !this.filterOutResult(setFilter, entry.email)) {
                entries.push(entry);
            }
        });
        return Promise.resolve(entries);
    }

    private buildUser(user: any) {
        const entry = new UserEntry();
        entry.externalId = user.id;
        entry.referenceId = user.id;
        entry.deleted = false;
        entry.disabled = user.status === 2;
        entry.email = user.email;
        const emailInvalid = (ue: UserEntry) => ue.email == null || ue.email === '';
        if (emailInvalid(entry) && user.username != null && user.username !== '') {
            if (this.validEmailAddress(user.username)) {
                entry.email = user.username;
            } else if (this.syncConfig.useEmailPrefixSuffix && this.syncConfig.emailSuffix != null) {
                entry.email = user.username + this.syncConfig.emailSuffix;
            }
        }
        if (entry.email != null) {
            entry.email = entry.email.trim().toLowerCase();
        }
        if (emailInvalid(entry) || !this.validEmailAddress(entry.email)) {
            return null;
        }
        return entry;
    }

    private async getGroups(force: boolean, setFilter: [boolean, Set<string>]): Promise<GroupEntry[]> {
        const entries: GroupEntry[] = [];
        const query = this.createDirectoryQuery(this.syncConfig.groupFilter);
        this.logService.info('Querying groups.');
        const roles = await this.apiGetMany('roles' + (query != null ? '?' + query : ''));
        roles.forEach((role) => {
            const entry = this.buildGroup(role);
            if (entry != null && !this.filterOutResult(setFilter, entry.name)) {
                entries.push(entry);
            }
        });
        return Promise.resolve(entries);
    }

    private buildGroup(group: any) {
        const entry = new GroupEntry();
        entry.externalId = group.id;
        entry.referenceId = group.id;
        entry.name = group.name;

        if (this.allUsers != null) {
            this.allUsers.forEach((user) => {
                if (user.role_id != null && user.role_id.indexOf(entry.referenceId) > -1) {
                    entry.userMemberExternalIds.add(user.id);
                }
            });
        }

        return entry;
    }

    private async getAccessToken() {
        const response = await fetch(`https://api.${this.dirConfig.region}.onelogin.com/auth/oauth2/v2/token`, {
            method: 'POST',
            headers: new Headers({
                'Authorization': 'Basic ' + btoa(this.dirConfig.clientId + ':' + this.dirConfig.clientSecret),
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json',
            }),
            body: JSON.stringify({
                grant_type: 'client_credentials',
            }),
        });
        if (response.status === 200) {
            const responseJson = await response.json();
            if (responseJson.access_token != null) {
                return responseJson.access_token;
            }
        }
        return null;
    }

    private async apiGetCall(url: string): Promise<any> {
        const req: RequestInit = {
            method: 'GET',
            headers: new Headers({
                'Authorization': 'bearer:' + this.accessToken,
                'Accept': 'application/json',
            }),
        };
        const response = await fetch(
            new Request(url, req));
        if (response.status === 200) {
            const responseJson = await response.json();
            return responseJson;
        }
        return null;
    }

    private async apiGetMany(endpoint: string, currentData: any[] = []): Promise<any[]> {
        const url = endpoint.indexOf('https://') === 0 ? endpoint :
            `https://api.${this.dirConfig.region}.onelogin.com/api/1/${endpoint}`;
        const response = await this.apiGetCall(url);
        if (response == null || response.status == null || response.data == null) {
            return currentData;
        }
        if (response.status.code !== 200) {
            throw new Error('API call failed.');
        }
        currentData = currentData.concat(response.data);
        if (response.pagination == null || response.pagination.next_link == null) {
            return currentData;
        }
        return this.apiGetMany(response.pagination.next_link, currentData);
    }

    private validEmailAddress(email: string) {
        return ValidEmailRegex.test(email);
    }
}
