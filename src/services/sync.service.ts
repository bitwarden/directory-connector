import { DirectoryType } from '../enums/directoryType';

import { GroupEntry } from '../models/groupEntry';
import { UserEntry } from '../models/userEntry';

import { ImportDirectoryRequest } from 'jslib/models/request/importDirectoryRequest';
import { ImportDirectoryRequestGroup } from 'jslib/models/request/importDirectoryRequestGroup';
import { ImportDirectoryRequestUser } from 'jslib/models/request/importDirectoryRequestUser';

import { LogService } from 'jslib/abstractions/log.service';
import { StorageService } from 'jslib/abstractions/storage.service';

import { AzureDirectoryService } from './azure-directory.service';
import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';
import { GSuiteDirectoryService } from './gsuite-directory.service';
import { LdapDirectoryService } from './ldap-directory.service';

const Keys = {
};

export class SyncService {
    private dirType: DirectoryType;

    constructor(private configurationService: ConfigurationService, private logService: LogService) { }

    async sync(force = true, sendToServer = true): Promise<[GroupEntry[], UserEntry[]]> {
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

        try {
            const entries = await directoryService.getEntries(force);
            const groups = entries[0];
            const users = entries[1];

            if (groups != null && groups.length > 0) {
                this.flattenUsersToGroups(groups, null, groups);
            }

            console.log(groups);
            console.log(users);

            if (!sendToServer) {
                // TODO: restore deltas
            }

            if (!sendToServer || groups == null || groups.length === 0 || users == null || users.length === 0) {
                return [groups, users];
            }

            const req = this.buildRequest(groups, users, syncConfig.removeDisabled);
        } catch (e) {
            // TODO: restore deltas
            // failed sync result
            throw e;
        }
    }

    private flattenUsersToGroups(currentGroups: GroupEntry[], currentGroupsUsers: string[], allGroups: GroupEntry[]) {
        currentGroups.forEach((group) => {
            const groupsInThisGroup = allGroups.filter((g) => group.groupMemberReferenceIds.has(g.referenceId));
            let usersInThisGroup = Array.from(group.userMemberExternalIds);

            if (currentGroupsUsers != null) {
                currentGroupsUsers.forEach((id) => group.userMemberExternalIds.add(id));
                usersInThisGroup = usersInThisGroup.concat(currentGroupsUsers);
            }

            this.flattenUsersToGroups(groupsInThisGroup, usersInThisGroup, allGroups);
        });
    }

    private getDirectoryService(): DirectoryService {
        switch (this.dirType) {
            case DirectoryType.GSuite:
                return new GSuiteDirectoryService(this.configurationService, this.logService);
            case DirectoryType.AzureActiveDirectory:
                return new AzureDirectoryService(this.configurationService);
            case DirectoryType.Ldap:
                return new LdapDirectoryService(this.configurationService, this.logService);
            default:
                return null;
        }
    }

    private buildRequest(groups: GroupEntry[], users: UserEntry[], removeDisabled: boolean): ImportDirectoryRequest {
        const model = new ImportDirectoryRequest();

        if (groups != null) {
            groups.forEach((g) => {
                const ig = new ImportDirectoryRequestGroup();
                ig.name = g.name;
                ig.externalId = g.externalId;
                ig.users = Array.from(g.userMemberExternalIds);
                model.groups.push(ig);
            });
        }

        if (users != null) {
            users.forEach((u) => {
                const iu = new ImportDirectoryRequestUser();
                iu.email = u.email;
                iu.externalId = u.externalId;
                iu.deleted = u.deleted || (removeDisabled && u.disabled);
                model.users.push(iu);
            });
        }

        return model;
    }
}
