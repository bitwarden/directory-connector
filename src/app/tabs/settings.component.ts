import {
    ChangeDetectorRef,
    Component,
    NgZone,
    OnDestroy,
    OnInit,
} from '@angular/core';

import { I18nService } from 'jslib/abstractions/i18n.service';

import { ConfigurationService } from '../../services/configuration.service';

import { DirectoryType } from '../../enums/directoryType';

import { AzureConfiguration } from '../../models/azureConfiguration';
import { GSuiteConfiguration } from '../../models/gsuiteConfiguration';
import { LdapConfiguration } from '../../models/ldapConfiguration';
import { OktaConfiguration } from '../../models/oktaConfiguration';
import { SyncConfiguration } from '../../models/syncConfiguration';

@Component({
    selector: 'app-settings',
    templateUrl: 'settings.component.html',
})
export class SettingsComponent implements OnInit, OnDestroy {
    directory: DirectoryType;
    directoryType = DirectoryType;
    ldap = new LdapConfiguration();
    gsuite = new GSuiteConfiguration();
    azure = new AzureConfiguration();
    okta = new OktaConfiguration();
    sync = new SyncConfiguration();
    directoryOptions: any[];

    constructor(private i18nService: I18nService, private configurationService: ConfigurationService,
        private changeDetectorRef: ChangeDetectorRef, private ngZone: NgZone) {
        this.directoryOptions = [
            { name: i18nService.t('select'), value: null },
            { name: 'Active Directory / LDAP', value: DirectoryType.Ldap },
            { name: 'Azure Active Directory', value: DirectoryType.AzureActiveDirectory },
            { name: 'G Suite (Google)', value: DirectoryType.GSuite },
            { name: 'Okta', value: DirectoryType.Okta },
        ];
    }

    async ngOnInit() {
        this.directory = await this.configurationService.getDirectoryType();
        this.ldap = (await this.configurationService.getDirectory<LdapConfiguration>(DirectoryType.Ldap)) ||
            this.ldap;
        this.gsuite = (await this.configurationService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite)) ||
            this.gsuite;
        this.azure = (await this.configurationService.getDirectory<AzureConfiguration>(
            DirectoryType.AzureActiveDirectory)) || this.azure;
        this.okta = (await this.configurationService.getDirectory<OktaConfiguration>(
            DirectoryType.Okta)) || this.okta;
        this.sync = (await this.configurationService.getSync()) || this.sync;
    }

    async ngOnDestroy() {
        await this.submit();
    }

    async submit() {
        if (this.ldap.ad) {
            this.sync.creationDateAttribute = 'whenCreated';
            this.sync.revisionDateAttribute = 'whenChanged';
            this.sync.emailPrefixAttribute = 'sAMAccountName';
            this.sync.groupPath = 'CN=Users';
            this.sync.userPath = 'CN=Users';
            this.sync.memberAttribute = 'member';
            this.sync.userObjectClass = 'person';
            this.sync.groupObjectClass = 'group';
            this.sync.userEmailAttribute = 'mail';
            this.sync.groupNameAttribute = 'name';
        }

        await this.configurationService.saveDirectoryType(this.directory);
        await this.configurationService.saveDirectory(DirectoryType.Ldap, this.ldap);
        await this.configurationService.saveDirectory(DirectoryType.GSuite, this.gsuite);
        await this.configurationService.saveDirectory(DirectoryType.AzureActiveDirectory, this.azure);
        await this.configurationService.saveDirectory(DirectoryType.Okta, this.okta);
        await this.configurationService.saveSync(this.sync);
    }

    async parseKeyFile() {
        const filePicker = (document.getElementById('keyFile') as HTMLInputElement);
        if (filePicker.files == null || filePicker.files.length < 0) {
            return;
        }

        const reader = new FileReader();
        reader.readAsText(filePicker.files[0], 'utf-8');
        reader.onload = (evt) => {
            this.ngZone.run(async () => {
                try {
                    const result = JSON.parse((evt.target as FileReader).result);
                    if (result.client_email != null && result.private_key != null) {
                        this.gsuite.clientEmail = result.client_email;
                        this.gsuite.privateKey = result.private_key;
                    }
                } catch { }
                this.changeDetectorRef.detectChanges();
            });

            // reset file input
            // ref: https://stackoverflow.com/a/20552042
            filePicker.type = '';
            filePicker.type = 'file';
            filePicker.value = '';
        };
    }
}
