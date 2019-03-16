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
import { StateService } from 'jslib/abstractions/state.service';

import { SyncService } from '../../services/sync.service';

import { GroupEntry } from '../../models/groupEntry';
import { UserEntry } from '../../models/userEntry';
import { ConfigurationService } from '../../services/configuration.service';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';

import { ConnectorUtils } from '../../utils';

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
        private toasterService: ToasterService, private changeDetectorRef: ChangeDetectorRef,
        private stateService: StateService) { }

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

        this.syncRunning = !!(await this.stateService.get('syncingDir'));
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
        this.toasterService.popAsync('success', null, this.i18nService.t('syncingStarted'));
    }

    async stop() {
        this.messagingService.send('cancelDirSync');
        this.syncRunning = false;
        this.toasterService.popAsync('success', null, this.i18nService.t('syncingStopped'));
    }

    async sync() {
        this.syncPromise = this.syncService.sync(false, false);
        const result = await this.syncPromise;
        const groupCount = result[0] != null ? result[0].length : 0;
        const userCount = result[1] != null ? result[1].length : 0;
        this.toasterService.popAsync('success', null,
            this.i18nService.t('syncCounts', groupCount.toString(), userCount.toString()));
    }

    async simulate() {
        this.simGroups = [];
        this.simUsers = [];
        this.simEnabledUsers = [];
        this.simDisabledUsers = [];
        this.simDeletedUsers = [];

        this.simPromise = new Promise(async (resolve, reject) => {
            try {
                const result = await ConnectorUtils.simulate(this.syncService, this.i18nService, this.simSinceLast);
                this.simGroups = result.groups;
                this.simUsers = result.users;
                this.simEnabledUsers = result.enabledUsers;
                this.simDisabledUsers = result.disabledUsers;
                this.simDeletedUsers = result.deletedUsers;
            } catch (e) {
                this.simGroups = null;
                this.simUsers = null;
                reject(e);
                return;
            }
            resolve();
        });
    }

    private async updateLastSync() {
        this.lastGroupSync = await this.configurationService.getLastGroupSyncDate();
        this.lastUserSync = await this.configurationService.getLastUserSyncDate();
    }
}
