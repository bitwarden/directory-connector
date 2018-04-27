import {
    Component,
    ComponentFactoryResolver,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';

import { ToasterService } from 'angular2-toaster';
import { Angulartics2 } from 'angulartics2';

import { I18nService } from 'jslib/abstractions/i18n.service';

import { ModalComponent } from 'jslib/angular/components/modal.component';

import { AzureDirectoryService } from '../../services/azure-directory.service';
import { GSuiteDirectoryService } from '../../services/gsuite-directory.service';
import { LdapDirectoryService } from '../../services/ldap-directory.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
})
export class DashboardComponent {
    @ViewChild('settings', { read: ViewContainerRef }) settingsModal: ViewContainerRef;

    constructor(analytics: Angulartics2, toasterService: ToasterService,
        i18nService: I18nService, private componentFactoryResolver: ComponentFactoryResolver) { }

    gsuite() {
        const gsuite = new GSuiteDirectoryService();
        const entries = gsuite.getEntries();
    }

    ldap() {
        const gsuite = new LdapDirectoryService();
        const entries = gsuite.getEntries();
    }

    azuread() {
        const gsuite = new AzureDirectoryService();
        const entries = gsuite.getEntries();
    }
}
