import {
    BodyOutputType,
    Toast,
    ToasterConfig,
    ToasterContainerComponent,
    ToasterService,
} from 'angular2-toaster';
import { Angulartics2 } from 'angulartics2';
import { Angulartics2GoogleAnalytics } from 'angulartics2/ga';

import {
    Component,
    ComponentFactoryResolver,
    NgZone,
    OnInit,
    SecurityContext,
    Type,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { ModalComponent } from 'jslib/angular/components/modal.component';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';

import { ApiService } from 'jslib/abstractions/api.service';
import { AuthService } from 'jslib/abstractions/auth.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { StateService } from 'jslib/abstractions/state.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { TokenService } from 'jslib/abstractions/token.service';
import { UserService } from 'jslib/abstractions/user.service';

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

    private lastActivity: number = null;
    private modal: ModalComponent = null;

    constructor(private angulartics2GoogleAnalytics: Angulartics2GoogleAnalytics,
        private broadcasterService: BroadcasterService, private userService: UserService,
        private tokenService: TokenService, private storageService: StorageService,
        private authService: AuthService, private router: Router, private analytics: Angulartics2,
        private toasterService: ToasterService, private i18nService: I18nService,
        private sanitizer: DomSanitizer, private ngZone: NgZone,
        private componentFactoryResolver: ComponentFactoryResolver, private messagingService: MessagingService,
        private configurationService: ConfigurationService, private syncService: SyncService,
        private stateService: StateService, private apiService: ApiService) {
        (window as any).BitwardenToasterService = toasterService;
    }

    ngOnInit() {
        this.broadcasterService.subscribe(BroadcasterSubscriptionId, async (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case 'loggedIn':
                        if (await this.userService.isAuthenticated()) {
                            const profile = await this.apiService.getProfile();
                            this.stateService.save('profileOrganizations', profile.organizations);
                        }
                        break;
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
                    case 'analyticsEventTrack':
                        this.analytics.eventTrack.next({
                            action: message.action,
                            properties: { label: message.label },
                        });
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

        await Promise.all([
            this.tokenService.clearToken(),
            this.userService.clear(),
        ]);

        this.authService.logOut(async () => {
            this.analytics.eventTrack.next({ action: 'Logged Out' });
            if (expired) {
                this.toasterService.popAsync('warning', this.i18nService.t('loggedOut'),
                    this.i18nService.t('loginExpired'));
            }
            this.router.navigate(['login']);
        });
    }

    private openModal<T>(type: Type<T>, ref: ViewContainerRef) {
        if (this.modal != null) {
            this.modal.close();
        }

        const factory = this.componentFactoryResolver.resolveComponentFactory(ModalComponent);
        this.modal = ref.createComponent(factory).instance;
        const childComponent = this.modal.show<T>(type, ref);

        this.modal.onClosed.subscribe(() => {
            this.modal = null;
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
