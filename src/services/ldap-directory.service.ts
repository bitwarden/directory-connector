import * as ldap from 'ldapjs';

import { DirectoryType } from '../enums/directoryType';

import { GroupEntry } from '../models/groupEntry';
import { LdapConfiguration } from '../models/ldapConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';

import { LogService } from 'jslib/abstractions/log.service';

export class LdapDirectoryService implements DirectoryService {
    private client: ldap.Client;
    private dirConfig: LdapConfiguration;
    private syncConfig: SyncConfiguration;

    constructor(private configurationService: ConfigurationService, private logService: LogService) { }

    async getEntries(force = false): Promise<[GroupEntry[], UserEntry[]]> {
        const type = await this.configurationService.getDirectoryType();
        if (type !== DirectoryType.Ldap) {
            return;
        }

        this.dirConfig = await this.configurationService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);
        if (this.dirConfig == null) {
            return;
        }

        this.syncConfig = await this.configurationService.getSync();
        if (this.syncConfig == null) {
            return;
        }

        await this.bind();

        let users: UserEntry[];
        if (this.syncConfig.users) {
            users = await this.getUsers(force);
        }

        let groups: GroupEntry[];
        if (this.syncConfig.groups) {
            let groupForce = force;
            if (!groupForce && users != null) {
                const activeUsers = users.filter((u) => !u.deleted && !u.disabled);
                groupForce = activeUsers.length > 0;
            }
            groups = await this.getGroups(groupForce);
        }

        await this.unbind();
        return [groups, users];
    }

    private async getUsers(force: boolean): Promise<UserEntry[]> {
        const lastSync = await this.configurationService.getLastUserSyncDate();

        let filter = this.buildBaseFilter(this.syncConfig.userObjectClass, this.syncConfig.userFilter);
        filter = this.buildRevisionFilter(filter, force, lastSync);

        const path = this.makeSearchPath(this.syncConfig.userPath);
        this.logService.info('User search: ' + path + ' => ' + filter);

        const regularUsers = await this.search<UserEntry>(path, filter,
            (item: any) => this.buildUser(item, false));

        if (!this.dirConfig.ad) {
            return regularUsers;
        }

        let deletedFilter = this.buildBaseFilter(this.syncConfig.userObjectClass, '(isDeleted=TRUE)');
        deletedFilter = this.buildRevisionFilter(deletedFilter, force, lastSync);

        const deletedPath = this.makeSearchPath('CN=Deleted Objects');
        this.logService.info('Deleted user search: ' + deletedPath + ' => ' + deletedFilter);

        const deletedUsers = await this.search<UserEntry>(deletedPath, deletedFilter,
            (item: any) => this.buildUser(item, true));
        return regularUsers.concat(deletedUsers);
    }

    private buildUser(item: any, deleted: boolean): UserEntry {
        const user = new UserEntry();
        user.referenceId = item.objectName;
        user.deleted = deleted;

        if (user.referenceId == null) {
            return null;
        }

        user.externalId = this.getExternalId(item, user.referenceId);
        user.disabled = this.entryDisabled(item);
        user.email = this.getAttr(item, this.syncConfig.userEmailAttribute);
        if (user.email == null && this.syncConfig.useEmailPrefixSuffix &&
            this.syncConfig.emailPrefixAttribute != null && this.syncConfig.emailSuffix != null) {
            const prefixAttr = this.getAttr(item, this.syncConfig.emailPrefixAttribute);
            if (prefixAttr != null) {
                user.email = (prefixAttr + this.syncConfig.emailSuffix).toLowerCase();
            }
        }

        if (!user.deleted && (user.email == null || user.email.trim() === '')) {
            return null;
        }

        // TODO: dates
        user.revisonDate = new Date();
        user.creationDate = new Date();

        return user;
    }

    private async getGroups(force: boolean): Promise<GroupEntry[]> {
        const entries: GroupEntry[] = [];

        const lastSync = await this.configurationService.getLastUserSyncDate();

        const originalFilter = this.buildBaseFilter(this.syncConfig.groupObjectClass, this.syncConfig.groupFilter);
        let filter = originalFilter;
        const revisionFilter = this.buildRevisionFilter(filter, force, lastSync);
        const searchSinceRevision = filter !== revisionFilter;
        filter = revisionFilter;

        const path = this.makeSearchPath(this.syncConfig.groupPath);
        this.logService.info('Group search: ' + path + ' => ' + filter);

        let items: any[] = [];
        const initialSearchGroupIds = await this.search<string>(path, filter, (item: any) => {
            items.push(item);
            return item.objectName;
        });

        if (searchSinceRevision && initialSearchGroupIds.length === 0) {
            return [];
        } else if (searchSinceRevision) {
            items = await this.search<string>(path, originalFilter, (item: any) => item);
        }

        const userFilter = this.buildBaseFilter(this.syncConfig.userObjectClass, this.syncConfig.userFilter);
        const userPath = this.makeSearchPath(this.syncConfig.userPath);

        const userIdMap = new Map<string, string>();
        await this.search<string>(path, filter, (item: any) => {
            userIdMap.set(item.objectName, this.getExternalId(item, item.objectName));
            return null;
        });

        items.forEach((item) => {
            const group = this.buildGroup(item, userIdMap);
            if (group != null) {
                entries.push(group);
            }
        });

        return entries;
    }

    private buildGroup(item: any, userMap: Map<string, string>) {
        const group = new GroupEntry();
        group.referenceId = item.objectName;
        if (group.referenceId == null) {
            return null;
        }

        group.externalId = this.getExternalId(item, group.referenceId);

        group.name = this.getAttr(item, this.syncConfig.groupNameAttribute);
        if (group.name == null) {
            group.name = this.getAttr(item, 'cn');
        }

        if (group.name == null) {
            return null;
        }

        // TODO: dates
        group.revisonDate = new Date();
        group.creationDate = new Date();

        const members = this.getAttrVals(item, this.syncConfig.memberAttribute);
        if (members != null) {
            members.forEach((memDn) => {
                if (userMap.has(memDn) && !group.userMemberExternalIds.has(userMap.get(memDn))) {
                    group.userMemberExternalIds.add(userMap.get(memDn));
                } else if (!group.groupMemberReferenceIds.has(memDn)) {
                    group.groupMemberReferenceIds.add(memDn);
                }
            });
        }

        return group;
    }

    private getExternalId(item: any, referenceId: string) {
        let externalId = this.getAttr(item, 'objectGUID'); // from guid to string?
        if (externalId == null) {
            externalId = referenceId;
        }
        return externalId;
    }

    private buildBaseFilter(objectClass: string, subFilter: string): string {
        let filter = this.buildObjectClassFilter(objectClass);
        if (subFilter != null && subFilter.trim() !== '') {
            filter = '(&' + filter + subFilter + ')';
        }
        return filter;
    }

    private buildObjectClassFilter(objectClass: string): string {
        return '(&(objectClass=' + objectClass + '))';
    }

    private buildRevisionFilter(baseFilter: string, force: boolean, lastRevisionDate: Date) {
        const revisionAttr = this.syncConfig.revisionDateAttribute;
        if (!force && lastRevisionDate != null && revisionAttr != null && revisionAttr.trim() !== '') {
            const dateString = lastRevisionDate.toISOString().replace(/[-:T]/g, '').substr(0, 16) + 'Z';
            baseFilter = '(&' + baseFilter + '(' + revisionAttr + '>=' + dateString + '))';
        }

        return baseFilter;
    }

    private makeSearchPath(pathPrefix: string) {
        if (this.dirConfig.rootPath != null && this.dirConfig.rootPath.trim() !== '') {
            const trimmedRootPath = this.dirConfig.rootPath.trim().toLowerCase();
            let path = trimmedRootPath.substr(trimmedRootPath.indexOf('dc='));
            if (pathPrefix != null && pathPrefix.trim() !== '') {
                path = pathPrefix.trim() + ',' + path;
            }
            return path;
        }

        return null;
    }

    private getAttrVals(searchEntry: any, attr: string): string[] {
        if (searchEntry == null || searchEntry.attributes == null) {
            return null;
        }

        const attrs = searchEntry.attributes.filter((a: any) => a.type === attr);
        if (attrs == null || attrs.length === 0 || attrs[0].vals == null || attrs[0].vals.length === 0) {
            return null;
        }

        return attrs[0].vals;
    }

    private getAttr(searchEntry: any, attr: string): string {
        const vals = this.getAttrVals(searchEntry, attr);
        if (vals == null) {
            return null;
        }
        return vals[0];
    }

    private entryDisabled(searchEntry: any): boolean {
        const control = this.getAttr(searchEntry, 'userAccountControl');
        if (control == null) {
            return false;
        }

        // TODO
        return false;
    }

    private async search<T>(path: string, filter: string, processEntry: (searchEntry: any) => T): Promise<T[]> {
        const options: ldap.SearchOptions = {
            filter: filter,
            scope: 'sub',
            paged: true,
        };

        const entries: T[] = [];
        return new Promise<T[]>((resolve, reject) => {
            this.client.search(path, options, (err, res) => {
                if (err != null) {
                    reject(err);
                    return;
                }

                res.on('error', (resErr) => {
                    reject(resErr);
                });

                res.on('searchEntry', (entry) => {
                    const e = processEntry(entry);
                    if (e != null) {
                        entries.push(e);
                    }
                });

                res.on('end', (result) => {
                    resolve(entries);
                });
            });
        });
    }

    private async bind(): Promise<any> {
        return new Promise((resolve, reject) => {
            const url = 'ldap' + (this.dirConfig.ssl ? 's' : '') + '://' + this.dirConfig.hostname +
                ':' + this.dirConfig.port;

            this.client = ldap.createClient({
                url: url.toLowerCase(),
            });

            const user = this.dirConfig.username == null || this.dirConfig.username.trim() === '' ? null :
                this.dirConfig.username;
            const pass = this.dirConfig.password == null || this.dirConfig.password.trim() === '' ? null :
                this.dirConfig.password;

            if (user == null && pass == null) {
                resolve();
                return;
            }

            this.client.bind(user, pass, (err) => {
                if (err != null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    private async unbind(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.client.unbind((err) => {
                if (err != null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
