import {
    BodyOutputType,
    Toast,
    ToasterConfig,
    ToasterService,
} from 'angular2-toaster';

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

import { BroadcasterService } from 'jslib-angular/services/broadcaster.service';

import { AuthService } from 'jslib-common/abstractions/auth.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { StateService } from 'jslib-common/abstractions/state.service';
import { TokenService } from 'jslib-common/abstractions/token.service';

import { ConfigurationService } from '../services/configuration.service';
import { SyncService } from '../services/sync.service';

const BroadcasterSubscriptionId = 'AppComponent';

@Component({
    selector: 'app-root',
    styles: [],
    template: `
        <toaster-container [toasterconfig]="toasterConfig"></toaster-container>
        <ng-template #settings></ng-template>
        <router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {
    @ViewChild('settings', { read: ViewContainerRef, static: true }) settingsRef: ViewContainerRef;

    toasterConfig: ToasterConfig = new ToasterConfig({
        showCloseButton: true,
        mouseoverTimerStop: true,
        animation: 'flyRight',
        limit: 5,
    });

    constructor(private broadcasterService: BroadcasterService, private tokenService: TokenService,
        private authService: AuthService, private router: Router,
        private toasterService: ToasterService, private i18nService: I18nService,
        private sanitizer: DomSanitizer, private ngZone: NgZone,
        private messagingService: MessagingService, private configurationService: ConfigurationService,
        private syncService: SyncService, private stateService: StateService) {
        (window as any).BitwardenToasterService = toasterService;
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
                        } catch { }

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
        await this.tokenService.clearToken();
        this.authService.logOut(async () => {
            if (expired) {
                this.toasterService.popAsync('warning', this.i18nService.t('loggedOut'),
                    this.i18nService.t('loginExpired'));
            }
            this.router.navigate(['login']);
        });
    }

    private showToast(msg: any) {
        const toast: Toast = {
            type: msg.type,
            title: msg.title,
        };
        if (typeof (msg.text) === 'string') {
            toast.body = msg.text;
        } else if (msg.text.length === 1) {
            toast.body = msg.text[0];
        } else {
            let message = '';
            msg.text.forEach((t: string) =>
                message += ('<p>' + this.sanitizer.sanitize(SecurityContext.HTML, t) + '</p>'));
            toast.body = message;
            toast.bodyOutputType = BodyOutputType.TrustedHtml;
        }
        if (msg.options != null) {
            if (msg.options.trustedHtml === true) {
                toast.bodyOutputType = BodyOutputType.TrustedHtml;
            }
            if (msg.options.timeout != null && msg.options.timeout > 0) {
                toast.timeout = msg.options.timeout;
            }
        }
        this.toasterService.popAsync(toast);
    }
}
