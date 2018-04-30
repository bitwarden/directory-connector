import { DirectoryType } from '../enums/directoryType';

import { LogService } from 'jslib/abstractions/log.service';
import { StorageService } from 'jslib/abstractions/storage.service';

import { AzureDirectoryService } from './azure-directory.service';
import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';
import { GSuiteDirectoryService } from './gsuite-directory.service';
import { LdapDirectoryService } from './ldap-directory.service';
import { GroupEntry } from '../models/groupEntry';

const Keys = {
};

export class SyncService {
    private dirType: DirectoryType;

    constructor(private configurationService: ConfigurationService, private logService: LogService) { }

    async sync(force = true, sendToServer = true): Promise<any> {
        this.dirType = await this.configurationService.getDirectoryType();
        if (this.dirType == null) {
            return;
        }

        const directoryService = this.getDirectoryService();
        if (directoryService == null) {
            return;
        }

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
                // TODO: return new sync result
            }
        } catch (e) {
            // TODO: restore deltas
            // failed sync result
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
}
