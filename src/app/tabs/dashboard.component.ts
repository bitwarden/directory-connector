import {
    Component,
    OnInit,
} from '@angular/core';

import { I18nService } from 'jslib/abstractions/i18n.service';

import { AzureDirectoryService } from '../../services/azure-directory.service';
import { GSuiteDirectoryService } from '../../services/gsuite-directory.service';
import { LdapDirectoryService } from '../../services/ldap-directory.service';
import { SyncService } from '../../services/sync.service';

import { Entry } from '../../models/entry';
import { GroupEntry } from '../../models/groupEntry';
import { UserEntry } from '../../models/userEntry';
import { ConfigurationService } from '../../services/configuration.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
})
export class DashboardComponent implements OnInit {
    simGroups: GroupEntry[];
    simUsers: UserEntry[];
    simEnabledUsers: UserEntry[] = [];
    simDisabledUsers: UserEntry[] = [];
    simDeletedUsers: UserEntry[] = [];
    simPromise: Promise<any>;
    simSinceLast: boolean = false;
    syncPromise: Promise<any>;
    lastGroupSync: Date;
    lastUserSync: Date;
    syncRunning: boolean;

    constructor(private i18nService: I18nService, private syncService: SyncService,
        private configurationService: ConfigurationService) { }

    async ngOnInit() {
        this.lastGroupSync = await this.configurationService.getLastGroupSyncDate();
        this.lastUserSync = await this.configurationService.getLastUserSyncDate();
    }

    async start() {
        this.syncRunning = true;
    }

    async stop() {
        this.syncRunning = false;
    }

    async sync() {
        this.syncPromise = this.syncService.sync(false, false);
        await this.syncPromise;
    }

    async simulate() {
        this.simGroups = null;
        this.simUsers = null;
        this.simEnabledUsers = [];
        this.simDisabledUsers = [];
        this.simDeletedUsers = [];

        this.simPromise = new Promise(async (resolve, reject) => {
            try {
                const result = await this.syncService.sync(!this.simSinceLast, true);
                this.simUsers = result[1];
                this.simGroups = result[0];
            } catch (e) {
                reject(e || 'Sync error.');
            }

            const userMap = new Map<string, UserEntry>();
            if (this.simUsers != null) {
                this.sort(this.simUsers);
                for (const u of this.simUsers) {
                    userMap.set(u.externalId, u);
                    if (u.deleted) {
                        this.simDeletedUsers.push(u);
                    } else if (u.disabled) {
                        this.simDisabledUsers.push(u);
                    } else {
                        this.simEnabledUsers.push(u);
                    }
                }
            }

            if (userMap.size > 0 && this.simGroups != null) {
                this.sort(this.simGroups);
                for (const g of this.simGroups) {
                    if (g.userMemberExternalIds == null) {
                        return;
                    }

                    for (const uid of g.userMemberExternalIds) {
                        if (userMap.has(uid)) {
                            if ((g as any).users == null) {
                                (g as any).users = [];
                            }
                            (g as any).users.push(userMap.get(uid));
                        }
                    }

                    if ((g as any).users != null) {
                        this.sort((g as any).users);
                    }
                }
            }
            resolve();
        });
    }

    private sort(arr: Entry[]) {
        arr.sort((a, b) => {
            return this.i18nService.collator ? this.i18nService.collator.compare(a.displayName, b.displayName) :
                a.displayName.localeCompare(b.displayName);
        });
    }
}
