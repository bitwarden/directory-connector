import {
    Component,
    OnInit,
} from '@angular/core';

import { ToasterService } from 'angular2-toaster';

import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { ConfigurationService } from '../../services/configuration.service';

@Component({
    selector: 'app-more',
    templateUrl: 'more.component.html',
})
export class MoreComponent implements OnInit {
    version: string;
    year: string;

    constructor(private platformUtilsService: PlatformUtilsService, private i18nService: I18nService,
        private messagingService: MessagingService, private configurationService: ConfigurationService,
        private toasterService: ToasterService) { }

    ngOnInit() {
        this.year = new Date().getFullYear().toString();
        this.version = this.platformUtilsService.getApplicationVersion();
    }

    async update() { }

    async logOut() {
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('logOutConfirmation'), this.i18nService.t('logOut'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            this.messagingService.send('logout');
        }
    }

    async clearCache() {
        await this.configurationService.clearStatefulSettings(true);
        this.toasterService.popAsync('success', null, this.i18nService.t('syncCacheCleared'));
    }
}
