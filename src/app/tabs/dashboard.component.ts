import { Component } from '@angular/core';

import { I18nService } from 'jslib/abstractions/i18n.service';

import { AzureDirectoryService } from '../../services/azure-directory.service';
import { GSuiteDirectoryService } from '../../services/gsuite-directory.service';
import { LdapDirectoryService } from '../../services/ldap-directory.service';
import { SyncService } from '../../services/sync.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
})
export class DashboardComponent {
    constructor(private i18nService: I18nService, private syncService: SyncService) { }

    async sync() {
        await this.syncService.sync(true, true);
    }

    async simulate() {
        await this.syncService.sync(true, false);
    }
}
