import {
    ChangeDetectorRef,
    Component,
    NgZone,
    OnDestroy,
    OnInit,
} from '@angular/core';

import { ToasterService } from 'angular2-toaster';

import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';

import { AzureDirectoryService } from '../../services/azure-directory.service';
import { GSuiteDirectoryService } from '../../services/gsuite-directory.service';
import { LdapDirectoryService } from '../../services/ldap-directory.service';
import { SyncService } from '../../services/sync.service';

import { Entry } from '../../models/entry';
import { GroupEntry } from '../../models/groupEntry';
import { UserEntry } from '../../models/userEntry';
import { ConfigurationService } from '../../services/configuration.service';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';

const BroadcasterSubscriptionId = 'DashboardComponent';

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
    simGroups: GroupEntry[];
    simUsers: UserEntry[];
    simEnabledUsers: UserEntry[] = [];
    simDisabledUsers: UserEntry[] = [];
    simDeletedUsers: UserEntry[] = [];
    simPromise: Promise<any>;
    simSinceLast: boolean = false;
    syncPromise: Promise<[GroupEntry[], UserEntry[]]>;
    startPromise: Promise<any>;
    lastGroupSync: Date;
    lastUserSync: Date;
    syncRunning: boolean;

    constructor(private i18nService: I18nService, private syncService: SyncService,
        private configurationService: ConfigurationService, private broadcasterService: BroadcasterService,
        private ngZone: NgZone, private messagingService: MessagingService,
        private toasterService: ToasterService, private changeDetectorRef: ChangeDetectorRef) { }

    async ngOnInit() {
        this.broadcasterService.subscribe(BroadcasterSubscriptionId, async (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case 'dirSyncCompleted':
                        this.updateLastSync();
                        break;
                    default:
                        break;
                }

                this.changeDetectorRef.detectChanges();
            });
        });

        this.updateLastSync();
    }

    async ngOnDestroy() {
        this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
    }

    async start() {
        this.startPromise = this.syncService.sync(false, false);
        await this.startPromise;
        this.messagingService.send('scheduleNextDirSync');
        this.syncRunning = true;
        this.toasterService.popAsync('success', null, 'Syncing started.');
    }

    async stop() {
        this.messagingService.send('cancelDirSync');
        this.syncRunning = false;
        this.toasterService.popAsync('success', null, 'Syncing stopped.');
    }

    async sync() {
        this.syncPromise = this.syncService.sync(false, false);
        const result = await this.syncPromise;
        const groupCount = result[0] != null ? result[0].length : 0;
        const userCount = result[1] != null ? result[1].length : 0;
        this.toasterService.popAsync('success', null, 'Synced ' + groupCount + ' groups and ' + userCount + ' users.');
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

    private async updateLastSync() {
        this.lastGroupSync = await this.configurationService.getLastGroupSyncDate();
        this.lastUserSync = await this.configurationService.getLastUserSyncDate();
    }
}
