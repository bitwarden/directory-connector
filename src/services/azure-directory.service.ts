import * as graph from '@microsoft/microsoft-graph-client';
import * as graphType from '@microsoft/microsoft-graph-types';
import * as https from 'https';
import * as querystring from 'querystring';

import { DirectoryType } from '../enums/directoryType';

import { AzureConfiguration } from '../models/azureConfiguration';
import { GroupEntry } from '../models/groupEntry';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';

const NextLink = '@odata.nextLink';
const DeltaLink = '@odata.deltaLink';

export class AzureDirectoryService implements DirectoryService {
    private client: graph.Client;
    private dirConfig: AzureConfiguration;
    private syncConfig: SyncConfiguration;

    constructor(private configurationService: ConfigurationService) {
        this.init();
    }

    async getEntries(force = false): Promise<[GroupEntry[], UserEntry[]]> {
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
            users = await this.getUsers(force);
        }

        let groups: GroupEntry[];
        if (this.syncConfig.groups) {
            groups = await this.getGroups();
        }

        return [groups, users];
    }

    private async getUsers(force: boolean): Promise<UserEntry[]> {
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

        const filter = this.createSet(this.syncConfig.userFilter);
        while (true) {
            const users: graphType.User[] = res.val;
            if (users != null) {
                users.forEach((user) => {
                    const entry = new UserEntry();
                    entry.referenceId = user.id;
                    entry.externalId = user.id;
                    entry.email = user.mail || user.userPrincipalName;
                    entry.disabled = user.accountEnabled == null ? false : !user.accountEnabled;

                    if (this.filterOutResult(filter, entry.email)) {
                        return;
                    }

                    if ((user as any)['@removed'] != null && (user as any)['@removed'].reason === 'changed') {
                        entry.deleted = true;
                    } else if (!entry.disabled && (entry.email == null || entry.email.indexOf('#') > -1)) {
                        return;
                    }

                    entries.push(entry);
                });
            }

            if (res[NextLink] == null) {
                if (res[DeltaLink] != null) {
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

    private async getGroups(): Promise<GroupEntry[]> {
        const entries: GroupEntry[] = [];

        const request = this.client.api('/groups/delta');
        const groups = await request.get();
        console.log(groups);

        groups.value.forEach(async (g: any) => {
            const membersRequest = this.client.api('/groups/' + g.id + '/members');
            const members = await membersRequest.get();
            console.log(members);
        });

        return entries;
    }

    private createSet(filter: string): [boolean, Set<string>] {
        if (filter == null || filter === '') {
            return null;
        }

        const parts = filter.split(':');
        if (parts.length !== 2) {
            return null;
        }

        const keyword = parts[0].trim().toLowerCase();
        let exclude = true;
        if (keyword === 'include') {
            exclude = false;
        } else if (keyword === 'exclude') {
            exclude = true;
        } else {
            return null;
        }

        const set = new Set<string>();
        const pieces = parts[1].split(',');
        pieces.forEach((p) => {
            set.add(p.trim().toLowerCase());
        });

        return [exclude, set];
    }

    private filterOutResult(filter: [boolean, Set<string>], result: string) {
        if (filter != null) {
            result = result.trim().toLowerCase();
            const excluded = filter[0];
            const set = filter[1];

            if (excluded && set.has(result)) {
                return true;
            } else if (!excluded && !set.has(result)) {
                return true;
            }
        }

        return false;
    }

    private init() {
        this.client = graph.Client.init({
            authProvider: (done) => {
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
}
