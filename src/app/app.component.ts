import {
    Component,
    NgZone,
    OnInit,
    SecurityContext,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
    IndividualConfig,
    ToastrService,
} from 'ngx-toastr';

import { AuthService } from 'jslib-common/abstractions/auth.service';
import { BroadcasterService } from 'jslib-common/abstractions/broadcaster.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { LogService } from 'jslib-common/abstractions/log.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { StateService } from 'jslib-common/abstractions/state.service';
import { TokenService } from 'jslib-common/abstractions/token.service';
import { UserService } from 'jslib-common/abstractions/user.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';

import { ConfigurationService } from '../services/configuration.service';
import { SyncService } from '../services/sync.service';

const BroadcasterSubscriptionId = 'AppComponent';

@Component({
    selector: 'app-root',
    styles: [],
    template: `
        <ng-template #settings></ng-template>
        <router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
    @ViewChild('settings', { read: ViewContainerRef, static: true }) settingsRef: ViewContainerRef;

    constructor(private broadcasterService: BroadcasterService, private userService: UserService,
        private tokenService: TokenService,
        private authService: AuthService, private router: Router,
        private toastrService: ToastrService, private i18nService: I18nService,
        private sanitizer: DomSanitizer, private ngZone: NgZone,
        private platformUtilsService: PlatformUtilsService, private messagingService: MessagingService,
        private configurationService: ConfigurationService, private syncService: SyncService,
        private stateService: StateService, private logService: LogService) {
    }

    ngOnInit() {
        this.broadcasterService.subscribe(BroadcasterSubscriptionId, async (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case 'syncScheduleStarted':
                    case 'syncScheduleStopped':
                        this.stateService.save('syncingDir', message.command === 'syncScheduleStarted');
                        break;
                    case 'logout':
                        this.logOut(!!message.expired);
                        break;
                    case 'checkDirSync':
                        try {
                            const syncConfig = await this.configurationService.getSync();
                            if (syncConfig.interval == null || syncConfig.interval < 5) {
                                return;
                            }

                            const syncInterval = syncConfig.interval * 60000;
                            const lastGroupSync = await this.configurationService.getLastGroupSyncDate();
                            const lastUserSync = await this.configurationService.getLastUserSyncDate();
                            let lastSync: Date = null;
                            if (lastGroupSync != null && lastUserSync == null) {
                                lastSync = lastGroupSync;
                            } else if (lastGroupSync == null && lastUserSync != null) {
                                lastSync = lastUserSync;
                            } else if (lastGroupSync != null && lastUserSync != null) {
                                if (lastGroupSync.getTime() < lastUserSync.getTime()) {
                                    lastSync = lastGroupSync;
                                } else {
                                    lastSync = lastUserSync;
                                }
                            }

                            let lastSyncAgo = syncInterval + 1;
                            if (lastSync != null) {
                                lastSyncAgo = new Date().getTime() - lastSync.getTime();
                            }

                            if (lastSyncAgo >= syncInterval) {
                                await this.syncService.sync(false, false);
                            }
                        } catch (e) {
                            this.logService.error(e);
                        }

                        this.messagingService.send('scheduleNextDirSync');
                        break;
                    case 'showToast':
                        this.showToast(message);
                        break;
                    case 'ssoCallback':
                        this.router.navigate(['sso'], { queryParams: { code: message.code, state: message.state } });
                        break;
                    default:
                }
            });
        });
    }

    ngOnDestroy() {
        this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
    }

    private async logOut(expired: boolean) {
        const userId = await this.userService.getUserId();

        await this.tokenService.clearToken();
        await this.userService.clear();

        this.authService.logOut(async () => {
            if (expired) {
                this.platformUtilsService.showToast('warning', this.i18nService.t('loggedOut'),
                    this.i18nService.t('loginExpired'));
            }
            this.router.navigate(['login']);
        });
    }

    private showToast(msg: any) {
        let message = '';

        const options: Partial<IndividualConfig> = {};

        if (typeof (msg.text) === 'string') {
            message = msg.text;
        } else if (msg.text.length === 1) {
            message = msg.text[0];
        } else {
            msg.text.forEach((t: string) =>
                message += ('<p>' + this.sanitizer.sanitize(SecurityContext.HTML, t) + '</p>'));
            options.enableHtml = true;
        }
        if (msg.options != null) {
            if (msg.options.trustedHtml === true) {
                options.enableHtml = true;
            }
            if (msg.options.timeout != null && msg.options.timeout > 0) {
                options.timeOut = msg.options.timeout;
            }
        }

        this.toastrService.show(message, msg.title, options, 'toast-' + msg.type);
    }
}
