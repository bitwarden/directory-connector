import * as graph from '@microsoft/microsoft-graph-client';
import * as graphType from '@microsoft/microsoft-graph-types';
import * as https from 'https';
import * as querystring from 'querystring';

import { DirectoryType } from '../enums/directoryType';

import { AzureConfiguration } from '../models/azureConfiguration';
import { GroupEntry } from '../models/groupEntry';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { BaseDirectoryService } from './baseDirectory.service';
import { ConfigurationService } from './configuration.service';
import { IDirectoryService } from './directory.service';

import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { LogService } from 'jslib-common/abstractions/log.service';

const NextLink = '@odata.nextLink';
const DeltaLink = '@odata.deltaLink';
const ObjectType = '@odata.type';
const UserSelectParams = '?$select=id,mail,userPrincipalName,displayName,accountEnabled';

enum UserSetType {
    IncludeUser,
    ExcludeUser,
    IncludeGroup,
    ExcludeGroup,
}

export class AzureDirectoryService extends BaseDirectoryService implements IDirectoryService {
    private client: graph.Client;
    private dirConfig: AzureConfiguration;
    private syncConfig: SyncConfiguration;
    private accessToken: string;
    private accessTokenExpiration: Date;

    constructor(private configurationService: ConfigurationService, private logService: LogService,
        private i18nService: I18nService) {
        super();
        this.init();
    }

    async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
        const type = await this.configurationService.getDirectoryType();
        if (type !== DirectoryType.AzureActiveDirectory) {
            return;
        }

        this.dirConfig = await this.configurationService.getDirectory<AzureConfiguration>(
            DirectoryType.AzureActiveDirectory);
        if (this.dirConfig == null) {
            return;
        }

        this.syncConfig = await this.configurationService.getSync();
        if (this.syncConfig == null) {
            return;
        }

        let users: UserEntry[];
        if (this.syncConfig.users) {
            users = await this.getCurrentUsers();
            const deletedUsers = await this.getDeletedUsers(force, !test);
            users = users.concat(deletedUsers);
        }

        let groups: GroupEntry[];
        if (this.syncConfig.groups) {
            const setFilter = await this.createAadCustomSet(this.syncConfig.groupFilter);
            groups = await this.getGroups(setFilter);
            users = this.filterUsersFromGroupsSet(users, groups, setFilter, this.syncConfig);
        }

        return [groups, users];
    }

    private async getCurrentUsers(): Promise<UserEntry[]> {
        const entryIds = new Set<string>();
        const entries: UserEntry[] = [];
        const userReq = this.client.api('/users' + UserSelectParams);
        let res = await userReq.get();
        const setFilter = this.createCustomUserSet(this.syncConfig.userFilter);
        while (true) {
            const users: graphType.User[] = res.value;
            if (users != null) {
                for (const user of users) {
                    if (user.id == null || entryIds.has(user.id)) {
                        continue;
                    }
                    const entry = this.buildUser(user);
                    if (await this.filterOutUserResult(setFilter, entry, true)) {
                        continue;
                    }

                    if (!entry.disabled && !entry.deleted &&
                        (entry.email == null || entry.email.indexOf('#') > -1)) {
                        continue;
                    }

                    entries.push(entry);
                    entryIds.add(user.id);
                }
            }

            if (res[NextLink] == null) {
                break;
            } else {
                const nextReq = this.client.api(res[NextLink]);
                res = await nextReq.get();
            }
        }

        return entries;
    }

    private async getDeletedUsers(force: boolean, saveDelta: boolean): Promise<UserEntry[]> {
        const entryIds = new Set<string>();
        const entries: UserEntry[] = [];

        let res: any = null;
        const token = await this.configurationService.getUserDeltaToken();
        if (!force && token != null) {
            try {
                const deltaReq = this.client.api(token);
                res = await deltaReq.get();
            } catch {
                res = null;
            }
        }

        if (res == null) {
            const userReq = this.client.api('/users/delta' + UserSelectParams);
            res = await userReq.get();
        }

        const setFilter = this.createCustomUserSet(this.syncConfig.userFilter);
        while (true) {
            const users: graphType.User[] = res.value;
            if (users != null) {
                for (const user of users) {
                    if (user.id == null || entryIds.has(user.id)) {
                        continue;
                    }
                    const entry = this.buildUser(user);
                    if (!entry.deleted) {
                        continue;
                    }
                    if (await this.filterOutUserResult(setFilter, entry, false)) {
                        continue;
                    }

                    entries.push(entry);
                    entryIds.add(user.id);
                }
            }

            if (res[NextLink] == null) {
                if (res[DeltaLink] != null && saveDelta) {
                    await this.configurationService.saveUserDeltaToken(res[DeltaLink]);
                }
                break;
            } else {
                const nextReq = this.client.api(res[NextLink]);
                res = await nextReq.get();
            }
        }

        return entries;
    }

    private async createAadCustomSet(filter: string): Promise<[boolean, Set<string>]> {
        if (filter == null || filter === '') {
            return null;
        }

        const mainParts = filter.split('|');
        if (mainParts.length < 1 || mainParts[0] == null || mainParts[0].trim() === '') {
            return null;
        }

        const parts = mainParts[0].split(':');
        if (parts.length !== 2) {
            return null;
        }

        const keyword = parts[0].trim().toLowerCase();
        let exclude = true;
        if (keyword === 'include') {
            exclude = false;
        } else if (keyword === 'exclude') {
            exclude = true;
        } else if (keyword === 'excludeadministrativeunit') {
            exclude = true;
        } else if (keyword === 'includeadministrativeunit') {
            exclude = false;
        } else {
            return null;
        }

        const set = new Set<string>();
        const pieces = parts[1].split(',');
        if (keyword === 'excludeadministrativeunit' || keyword === 'includeadministrativeunit') {
            for (const p of pieces) {
                const auMembers = await this.client
                    .api(`https://graph.microsoft.com/v1.0/directory/administrativeUnits/${p}/members`).get();
                for (const auMember of auMembers.value) {
                    if (auMember['@odata.type'] === '#microsoft.graph.group') {
                        set.add(auMember.displayName.toLowerCase());
                    }
                }
            }
        } else {
            for (const p of pieces) {
                set.add(p.trim().toLowerCase());
            }
        }
        return [exclude, set];
    }

    private createCustomUserSet(filter: string): [UserSetType, Set<string>] {
        if (filter == null || filter === '') {
            return null;
        }

        const mainParts = filter.split('|');
        if (mainParts.length < 1 || mainParts[0] == null || mainParts[0].trim() === '') {
            return null;
        }

        const parts = mainParts[0].split(':');
        if (parts.length !== 2) {
            return null;
        }

        const keyword = parts[0].trim().toLowerCase();
        let userSetType = UserSetType.IncludeUser;
        if (keyword === 'include') {
            userSetType = UserSetType.IncludeUser;
        } else if (keyword === 'exclude') {
            userSetType = UserSetType.ExcludeUser;
        } else if (keyword === 'includegroup') {
            userSetType = UserSetType.IncludeGroup;
        } else if (keyword === 'excludegroup') {
            userSetType = UserSetType.ExcludeGroup;
        } else {
            return null;
        }

        const set = new Set<string>();
        const pieces = parts[1].split(',');
        for (const p of pieces) {
            set.add(p.trim().toLowerCase());
        }

        return [userSetType, set];
    }

    private async filterOutUserResult(setFilter: [UserSetType, Set<string>], user: UserEntry,
        checkGroupsFilter: boolean): Promise<boolean> {
        if (setFilter == null) {
            return false;
        }

        let userSetTypeExclude = null;
        if (setFilter[0] === UserSetType.IncludeUser) {
            userSetTypeExclude = false;
        } else if (setFilter[0] === UserSetType.ExcludeUser) {
            userSetTypeExclude = true;
        }

        if (userSetTypeExclude != null) {
            return this.filterOutResult([userSetTypeExclude, setFilter[1]], user.email);
        }

        // We need to *not* call the /checkMemberGroups method for deleted users, it will always fail
        if (!checkGroupsFilter) {
            return false;
        }
        const memberGroups = await this.client.api(`/users/${user.externalId}/checkMemberGroups`).post({
            groupIds: Array.from(setFilter[1]),
        });
        if (memberGroups.value.length > 0 && setFilter[0] === UserSetType.IncludeGroup) {
            return false;
        } else if (memberGroups.value.length > 0 && setFilter[0] === UserSetType.ExcludeGroup) {
            return true;
        } else if (memberGroups.value.length === 0 && setFilter[0] === UserSetType.IncludeGroup) {
            return true;
        } else if (memberGroups.value.length === 0 && setFilter[0] === UserSetType.ExcludeGroup) {
            return false;
        }

        return false;
    }

    private buildUser(user: graphType.User): UserEntry {
        const entry = new UserEntry();
        entry.referenceId = user.id;
        entry.externalId = user.id;
        entry.email = user.mail;

        if (user.userPrincipalName && (entry.email == null || entry.email === '' ||
            entry.email.indexOf('onmicrosoft.com') > -1)) {
            entry.email = user.userPrincipalName;
        }

        if (entry.email != null) {
            entry.email = entry.email.trim().toLowerCase();
        }

        entry.disabled = user.accountEnabled == null ? false : !user.accountEnabled;

        if ((user as any)['@removed'] != null && (user as any)['@removed'].reason === 'changed') {
            entry.deleted = true;
        }

        return entry;
    }

    private async getGroups(setFilter: [boolean, Set<string>]): Promise<GroupEntry[]> {
        const entryIds = new Set<string>();
        const entries: GroupEntry[] = [];
        const groupsReq = this.client.api('/groups');
        let res = await groupsReq.get();
        while (true) {
            const groups: graphType.Group[] = res.value;
            if (groups != null) {
                for (const group of groups) {
                    if (group.id == null || entryIds.has(group.id)) {
                        continue;
                    }
                    if (this.filterOutResult(setFilter, group.displayName)) {
                        continue;
                    }

                    const entry = await this.buildGroup(group);
                    entries.push(entry);
                    entryIds.add(group.id);
                }
            }

            if (res[NextLink] == null) {
                break;
            } else {
                const nextReq = this.client.api(res[NextLink]);
                res = await nextReq.get();
            }
        }

        return entries;
    }

    private async buildGroup(group: graphType.Group): Promise<GroupEntry> {
        const entry = new GroupEntry();
        entry.referenceId = group.id;
        entry.externalId = group.id;
        entry.name = group.displayName;

        const memReq = this.client.api('/groups/' + group.id + '/members');
        let memRes = await memReq.get();
        while (true) {
            const members: any = memRes.value;
            if (members != null) {
                for (const member of members) {
                    if (member[ObjectType] === '#microsoft.graph.group') {
                        entry.groupMemberReferenceIds.add((member as graphType.Group).id);
                    } else if (member[ObjectType] === '#microsoft.graph.user') {
                        entry.userMemberExternalIds.add((member as graphType.User).id);
                    }
                }
            }
            if (memRes[NextLink] == null) {
                break;
            } else {
                const nextMemReq = this.client.api(memRes[NextLink]);
                memRes = await nextMemReq.get();
            }
        }

        return entry;
    }

    private init() {
        this.client = graph.Client.init({
            authProvider: done => {
                if (this.dirConfig.applicationId == null || this.dirConfig.key == null ||
                    this.dirConfig.tenant == null || this.dirConfig.identityAuthority == null) {
                    done(new Error(this.i18nService.t('dirConfigIncomplete')), null);
                    return;
                }

                if (!this.accessTokenIsExpired()) {
                    done(null, this.accessToken);
                    return;
                }

                this.accessToken = null;
                this.accessTokenExpiration = null;

                const data = querystring.stringify({
                    client_id: this.dirConfig.applicationId,
                    client_secret: this.dirConfig.key,
                    grant_type: 'client_credentials',
                    scope: 'https://graph.microsoft.com/.default',
                });

                const req = https.request({
                    host: this.dirConfig.identityAuthority,
                    path: '/' + this.dirConfig.tenant + '/oauth2/v2.0/token',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(data),
                    },
                }, res => {
                    res.setEncoding('utf8');
                    res.on('data', (chunk: string) => {
                        const d = JSON.parse(chunk);
                        if (res.statusCode === 200 && d.access_token != null) {
                            this.setAccessTokenExpiration(d.access_token, d.expires_in);
                            done(null, d.access_token);
                        } else if (d.error != null && d.error_description != null) {
                            const shortError = d.error_description?.split('\n', 1)[0];
                            const err = new Error(d.error + ' (' + res.statusCode + '): ' + shortError);
                            // tslint:disable-next-line
                            console.error(d.error_description);
                            done(err, null);
                        } else {
                            const err = new Error('Unknown error (' + res.statusCode + ').');
                            done(err, null);
                        }
                    });
                }).on('error', err => {
                    done(err, null);
                });

                req.write(data);
                req.end();
            },
        });
    }

    private accessTokenIsExpired() {
        if (this.accessToken == null || this.accessTokenExpiration == null) {
            return true;
        }

        // expired if less than 2 minutes til expiration
        const now = new Date();
        return this.accessTokenExpiration.getTime() - now.getTime() < 120000;
    }

    private setAccessTokenExpiration(accessToken: string, expSeconds: number) {
        if (accessToken == null || expSeconds == null) {
            return;
        }

        this.accessToken = accessToken;
        const exp = new Date();
        exp.setSeconds(exp.getSeconds() + expSeconds);
        this.accessTokenExpiration = exp;
    }
}
