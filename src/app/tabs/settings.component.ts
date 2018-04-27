import {
    Component,
    ComponentFactoryResolver,
    OnInit,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';

import { ToasterService } from 'angular2-toaster';
import { Angulartics2 } from 'angulartics2';

import { I18nService } from 'jslib/abstractions/i18n.service';
import { StorageService } from 'jslib/abstractions/storage.service';

import { ConfigurationService } from '../../services/configuration.service';

import { DirectoryType } from '../../enums/directoryType';

import { AzureConfiguration } from '../../models/azureConfiguration';
import { GSuiteConfiguration } from '../../models/gsuiteConfiguration';
import { LdapConfiguration } from '../../models/ldapConfiguration';
import { SyncConfiguration } from '../../models/syncConfiguration';

@Component({
    selector: 'app-settings',
    templateUrl: 'settings.component.html',
})
export class SettingsComponent implements OnInit {
    directory: DirectoryType;
    directoryType = DirectoryType;
    ldap = new LdapConfiguration();
    gsuite = new GSuiteConfiguration();
    azure = new AzureConfiguration();
    sync = new SyncConfiguration();
    directoryOptions: any[];

    constructor(analytics: Angulartics2, toasterService: ToasterService,
        i18nService: I18nService, private componentFactoryResolver: ComponentFactoryResolver,
        private configurationService: ConfigurationService, private storageService: StorageService) {
        this.directoryOptions = [
            { name: i18nService.t('select'), value: null },
            { name: 'Active Directory / LDAP', value: DirectoryType.Ldap },
            { name: 'Azure Active Directory', value: DirectoryType.AzureActiveDirectory },
            { name: 'G Suite (Google)', value: DirectoryType.GSuite },
        ];
    }

    async ngOnInit() {
        this.directory = await this.storageService.get<DirectoryType>('directory');
        this.ldap = (await this.configurationService.get<LdapConfiguration>(DirectoryType.Ldap)) ||
            this.ldap;
        this.gsuite = (await this.configurationService.get<GSuiteConfiguration>(DirectoryType.GSuite)) ||
            this.gsuite;
        this.azure = (await this.configurationService.get<AzureConfiguration>(DirectoryType.AzureActiveDirectory)) ||
            this.azure;
        this.sync = (await this.storageService.get<SyncConfiguration>('syncConfig')) || this.sync;
    }

    async submit() {
        await this.storageService.save('directory', this.directory);
        await this.configurationService.save(DirectoryType.Ldap, this.ldap);
        await this.configurationService.save(DirectoryType.GSuite, this.gsuite);
        await this.configurationService.save(DirectoryType.AzureActiveDirectory, this.azure);
        await this.storageService.save('syncConfig', this.sync);
    }
}
