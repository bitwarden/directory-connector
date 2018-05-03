import { JWT } from 'google-auth-library';
import {
    google,
    GoogleApis,
} from 'googleapis';
import {
    Admin,
    Schema$Group,
    Schema$User,
} from 'googleapis/build/src/apis/admin/directory_v1';

import { DirectoryType } from '../enums/directoryType';

import { GroupEntry } from '../models/groupEntry';
import { GSuiteConfiguration } from '../models/gsuiteConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';

import { LogService } from 'jslib/abstractions/log.service';

export class GSuiteDirectoryService implements DirectoryService {
    private client: JWT;
    private service: Admin;
    private authParams: any;
    private dirConfig: GSuiteConfiguration;
    private syncConfig: SyncConfiguration;

    constructor(private configurationService: ConfigurationService, private logService: LogService) {
        this.service = google.admin<Admin>('directory_v1');
    }

    async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
        const type = await this.configurationService.getDirectoryType();
        if (type !== DirectoryType.GSuite) {
            return;
        }

        this.dirConfig = await this.configurationService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite);
        if (this.dirConfig == null) {
            return;
        }

        this.syncConfig = await this.configurationService.getSync();
        if (this.syncConfig == null) {
            return;
        }

        await this.auth();

        let users: UserEntry[];
        if (this.syncConfig.users) {
            users = await this.getUsers();
        }

        let groups: GroupEntry[];
        if (this.syncConfig.groups) {
            groups = await this.getGroups();
        }

        return [groups, users];
    }

    private async getUsers(): Promise<UserEntry[]> {
        const entries: UserEntry[] = [];
        const query = this.createQuery(this.syncConfig.userFilter);

        this.logService.info('Querying users.');
        let p = Object.assign({ query: query }, this.authParams);
        const res = await this.service.users.list(p);
        if (res.status !== 200) {
            throw new Error('User list API failed: ' + res.statusText);
        }

        const filter = this.createSet(this.syncConfig.userFilter);
        if (res.data.users != null) {
            for (const user of res.data.users) {
                if (this.filterOutResult(filter, user.primaryEmail)) {
                    return;
                }

                const entry = this.buildUser(user, false);
                if (entry != null) {
                    entries.push(entry);
                }
            }
        }

        this.logService.info('Querying deleted users.');
        p = Object.assign({ showDeleted: true, query: query }, this.authParams);
        const delRes = await this.service.users.list(p);
        if (delRes.status !== 200) {
            throw new Error('Deleted user list API failed: ' + delRes.statusText);
        }

        if (delRes.data.users != null) {
            for (const user of delRes.data.users) {
                if (this.filterOutResult(filter, user.primaryEmail)) {
                    return;
                }

                const entry = this.buildUser(user, true);
                if (entry != null) {
                    entries.push(entry);
                }
            }
        }

        return entries;
    }

    private buildUser(user: Schema$User, deleted: boolean) {
        if ((user.emails == null || user.emails === '') && !deleted) {
            return null;
        }

        const entry = new UserEntry();
        entry.referenceId = user.id;
        entry.externalId = user.id;
        entry.email = user.primaryEmail;
        entry.disabled = user.suspended || false;
        entry.deleted = deleted;
        // entry.creationDate = user.creationTime; // TODO: string to date conversion
        return entry;
    }

    private async getGroups(): Promise<GroupEntry[]> {
        const entries: GroupEntry[] = [];

        this.logService.info('Querying groups.');
        const res = await this.service.groups.list(this.authParams);
        if (res.status !== 200) {
            throw new Error('Group list API failed: ' + res.statusText);
        }

        const filter = this.createSet(this.syncConfig.groupFilter);
        if (res.data.groups != null) {
            for (const group of res.data.groups) {
                if (this.filterOutResult(filter, group.name)) {
                    return;
                }

                const entry = await this.buildGroup(group);
                entries.push(entry);
            }
        }

        return entries;
    }

    private async buildGroup(group: Schema$Group) {
        const entry = new GroupEntry();
        entry.referenceId = group.id;
        entry.externalId = group.id;
        entry.name = group.name;

        const p = Object.assign({ groupKey: group.id }, this.authParams);
        const memRes = await this.service.members.list(p);
        if (memRes.status !== 200) {
            this.logService.warning('Group member list API failed: ' + memRes.statusText);
            return entry;
        }

        if (memRes.data.members != null) {
            for (const member of memRes.data.members) {
                if (member.role.toLowerCase() !== 'member') {
                    return;
                }
                if (member.status.toLowerCase() !== 'active') {
                    return;
                }

                if (member.type.toLowerCase() === 'user') {
                    entry.userMemberExternalIds.add(member.id);
                } else if (member.type.toLowerCase() === 'group') {
                    entry.groupMemberReferenceIds.add(member.id);
                }
            }
        }

        return entry;
    }

    private createQuery(filter: string) {
        if (filter == null || filter === '') {
            return null;
        }

        const mainParts = filter.split('|');
        if (mainParts.length < 2 || mainParts[1] == null || mainParts[1].trim() === '') {
            return null;
        }

        return mainParts[1].trim();
    }

    private createSet(filter: string): [boolean, Set<string>] {
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
        } else {
            return null;
        }

        const set = new Set<string>();
        const pieces = parts[1].split(',');
        for (const p of pieces) {
            set.add(p.trim().toLowerCase());
        }

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

    private async auth() {
        this.client = new google.auth.JWT({
            email: this.dirConfig.clientEmail,
            key: this.dirConfig.privateKey,
            subject: this.dirConfig.adminUser,
            scopes: [
                'https://www.googleapis.com/auth/admin.directory.user.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
            ],
        });

        await this.client.authorize();

        this.authParams = {
            auth: this.client,
            domain: this.dirConfig.domain,
        };
        if (this.dirConfig.customer != null) {
            this.authParams.customer = this.dirConfig.customer;
        }
    }
}
