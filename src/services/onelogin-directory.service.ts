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

export class OneLoginDirectoryService extends BaseDirectoryService implements DirectoryService {
    private dirConfig: OneLoginConfiguration;
    private syncConfig: SyncConfiguration;
    private accessToken: string;

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
        const lastSync = await this.configurationService.getLastUserSyncDate();
        // const oktaFilter = this.buildOktaFilter(this.syncConfig.userFilter, force, lastSync);
        const setFilter = this.createCustomSet(this.syncConfig.userFilter);

        this.logService.info('Querying users.');
        /*
        const usersPromise = this.client.listUsers({ filter: oktaFilter }).each((user: any) => {
            const entry = this.buildUser(user);
            if (entry != null && !this.filterOutResult(setFilter, entry.email)) {
                entries.push(entry);
            }
        });
        */
        const users = this.getApi('users');
        return Promise.resolve([]);
    }

    private async getGroups(force: boolean, setFilter: [boolean, Set<string>]): Promise<GroupEntry[]> {
        return Promise.resolve([]);
    }

    private requestInterceptor(): any {
        return {
            requestInterceptor: (req: any) => {
                req.headers.Authorization = 'bearer:' + this.accessToken;
                return req;
            },
        };
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

    private async getApi(endpoint: string): Promise<any> {
        const req: RequestInit = {
            method: 'GET',
            headers: new Headers({
                'Authorization': 'bearer:' + this.accessToken,
                'Accept': 'application/json',
            }),
        };
        const response = await fetch(
            new Request(`https://api.${this.dirConfig.region}.onelogin.com/api/1/${endpoint}`, req));
        if (response.status === 200) {
            const responseJson = await response.json();
            return responseJson;
        }
        return null;
    }
}
