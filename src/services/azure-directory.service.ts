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
import { DirectoryService } from './directory.service';

import { I18nService } from 'jslib/abstractions/i18n.service';
import { LogService } from 'jslib/abstractions/log.service';

const NextLink = '@odata.nextLink';
const DeltaLink = '@odata.deltaLink';
const ObjectType = '@odata.type';

export class AzureDirectoryService extends BaseDirectoryService implements DirectoryService {
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
            users = await this.getUsers(force, !test);
        }

        let groups: GroupEntry[];
        if (this.syncConfig.groups) {
            const setFilter = this.createCustomSet(this.syncConfig.groupFilter);
            groups = await this.getGroups(setFilter);
            users = this.filterUsersFromGroupsSet(users, groups, setFilter);
        }

        return [groups, users];
    }

    private async getUsers(force: boolean, saveDelta: boolean): Promise<UserEntry[]> {
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
            const userReq = this.client.api('/users/delta');
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
                    if (this.filterOutUserResult(setFilter, user)) {
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
        } else if (keyword === 'includeGroup') {
            userSetType = UserSetType.IncludeGroup;
        } else if (keyword === 'excludeGroup') {
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

    private async filterOutUserResult(setFilter: [UserSetType, Set<string>], user: graphType.User): Promise<boolean> {
        if (setFilter != null) {
            let userSetTypeExclude = null;
            if (setFilter[0] === UserSetType.IncludeUser) {
                userSetTypeExclude = false;
            } else if (setFilter[0] === UserSetType.ExcludeUser) {
                userSetTypeExclude = true;
            }
            if (userSetTypeExclude != null) {
                const entry = this.buildUser(user);
                if (this.filterOutResult([userSetTypeExclude, setFilter[1]], entry.email)) {
                    return true;
                }
                else {
                    return false;
                }
            } else {
                let memberGroups = await this.client.api(`/users/${user.id}/checkMemberGroups`).post({
                    groupIds: Array.from(setFilter[1])
                });
                if(memberGroups.value.length > 0 && setFilter[0] == UserSetType.IncludeGroup) {
                    return false;
                } else if (memberGroups.value.length > 0 && setFilter[0] == UserSetType.ExcludeGroup) {
                    return true;
                } else if (memberGroups.value.length == 0 && setFilter[0] == UserSetType.IncludeGroup) {
                    return true;
                } else if (memberGroups.value.length == 0 && setFilter[0] == UserSetType.ExcludeGroup) {
                    return false;
                }
            }
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
        const memRes = await memReq.get();
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

        return entry;
    }

    private init() {
        this.client = graph.Client.init({
            authProvider: (done) => {
                if (this.dirConfig.applicationId == null || this.dirConfig.key == null ||
                    this.dirConfig.tenant == null) {
                    done(this.i18nService.t('dirConfigIncomplete'), null);
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
                    host: 'login.microsoftonline.com',
                    path: '/' + this.dirConfig.tenant + '/oauth2/v2.0/token',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(data),
                    },
                }, (res) => {
                    res.setEncoding('utf8');
                    res.on('data', (chunk: string) => {
                        const d = JSON.parse(chunk);
                        if (res.statusCode === 200 && d.access_token != null) {
                            this.setAccessTokenExpiration(d.access_token, d.expires_in);
                            done(null, d.access_token);
                        } else if (d.error != null && d.error_description != null) {
                            done(d.error + ' (' + res.statusCode + '): ' + d.error_description, null);
                        } else {
                            done('Unknown error (' + res.statusCode + ').', null);
                        }
                    });
                }).on('error', (err) => {
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

enum UserSetType {
    IncludeUser,
    ExcludeUser,
    IncludeGroup,
    ExcludeGroup
}