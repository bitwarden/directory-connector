import {
    ToasterConfig,
    ToasterContainerComponent,
} from 'angular2-toaster';
import { Angulartics2GoogleAnalytics } from 'angulartics2/ga';

import {
    Component,
    ComponentFactoryResolver,
    NgZone,
    OnDestroy,
    OnInit,
    Type,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { Router } from '@angular/router';

import { ToasterService } from 'angular2-toaster';
import { Angulartics2 } from 'angulartics2';

import { ModalComponent } from 'jslib/angular/components/modal.component';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';

import { AuthService } from 'jslib/abstractions/auth.service';
import { CryptoService } from 'jslib/abstractions/crypto.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { TokenService } from 'jslib/abstractions/token.service';
import { UserService } from 'jslib/abstractions/user.service';

import { ConstantsService } from 'jslib/services/constants.service';

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
    @ViewChild('settings', { read: ViewContainerRef }) settingsRef: ViewContainerRef;

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
        private platformUtilsService: PlatformUtilsService, private ngZone: NgZone,
        private cryptoService: CryptoService, private componentFactoryResolver: ComponentFactoryResolver,
        private messagingService: MessagingService) { }

    ngOnInit() {
        this.ngZone.runOutsideAngular(() => {
            setTimeout(async () => {
                await this.updateAppMenu();
            }, 1000);

            window.onmousemove = () => this.recordActivity();
            window.onmousedown = () => this.recordActivity();
            window.ontouchstart = () => this.recordActivity();
            window.onclick = () => this.recordActivity();
            window.onscroll = () => this.recordActivity();
            window.onkeypress = () => this.recordActivity();
        });

        this.broadcasterService.subscribe(BroadcasterSubscriptionId, async (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case 'loggedIn':
                    case 'unlocked':
                    case 'loggedOut':
                        this.updateAppMenu();
                        break;
                    case 'logout':
                        this.logOut(!!message.expired);
                        break;
                    default:
                }
            });
        });
    }

    ngOnDestroy() {
        this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
    }

    private async updateAppMenu() {
        this.messagingService.send('updateAppMenu', {
            isAuthenticated: await this.userService.isAuthenticated(),
            isLocked: (await this.cryptoService.getKey()) == null,
        });
    }

    private async logOut(expired: boolean) {
        const userId = await this.userService.getUserId();

        await Promise.all([
            this.tokenService.clearToken(),
            this.cryptoService.clearKeys(),
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

    private async recordActivity() {
        const now = (new Date()).getTime();
        if (this.lastActivity != null && now - this.lastActivity < 250) {
            return;
        }

        this.lastActivity = now;
        this.storageService.save(ConstantsService.lastActiveKey, now);
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
}
