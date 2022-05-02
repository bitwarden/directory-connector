import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from "@angular/core";

import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";

import { StateService } from "../../abstractions/state.service";
import { DirectoryType } from "../../enums/directoryType";
import { AzureConfiguration } from "../../models/azureConfiguration";
import { GSuiteConfiguration } from "../../models/gsuiteConfiguration";
import { LdapConfiguration } from "../../models/ldapConfiguration";
import { OktaConfiguration } from "../../models/oktaConfiguration";
import { OneLoginConfiguration } from "../../models/oneLoginConfiguration";
import { SyncConfiguration } from "../../models/syncConfiguration";
import { ConnectorUtils } from "../../utils";

@Component({
  selector: "app-settings",
  templateUrl: "settings.component.html",
})
export class SettingsComponent implements OnInit, OnDestroy {
  directory: DirectoryType;
  directoryType = DirectoryType;
  ldap = new LdapConfiguration();
  gsuite = new GSuiteConfiguration();
  azure = new AzureConfiguration();
  okta = new OktaConfiguration();
  oneLogin = new OneLoginConfiguration();
  sync = new SyncConfiguration();
  directoryOptions: any[];
  showLdapPassword = false;
  showAzureKey = false;
  showOktaKey = false;
  showOneLoginSecret = false;

  constructor(
    private i18nService: I18nService,
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private logService: LogService,
    private stateService: StateService
  ) {
    this.directoryOptions = [
      { name: this.i18nService.t("select"), value: null },
      { name: "Active Directory / LDAP", value: DirectoryType.Ldap },
      { name: "Azure Active Directory", value: DirectoryType.AzureActiveDirectory },
      { name: "G Suite (Google)", value: DirectoryType.GSuite },
      { name: "Okta", value: DirectoryType.Okta },
      { name: "OneLogin", value: DirectoryType.OneLogin },
    ];
  }

  async ngOnInit() {
    this.directory = await this.stateService.getDirectoryType();
    this.ldap =
      (await this.stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap)) || this.ldap;
    this.gsuite =
      (await this.stateService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite)) ||
      this.gsuite;
    this.azure =
      (await this.stateService.getDirectory<AzureConfiguration>(
        DirectoryType.AzureActiveDirectory
      )) || this.azure;
    this.okta =
      (await this.stateService.getDirectory<OktaConfiguration>(DirectoryType.Okta)) || this.okta;
    this.oneLogin =
      (await this.stateService.getDirectory<OneLoginConfiguration>(DirectoryType.OneLogin)) ||
      this.oneLogin;
    this.sync = (await this.stateService.getSync()) || this.sync;
  }

  async ngOnDestroy() {
    await this.submit();
  }

  async submit() {
    ConnectorUtils.adjustConfigForSave(this.ldap, this.sync);
    if (this.ldap != null && this.ldap.ad) {
      this.ldap.pagedSearch = true;
    }
    await this.stateService.setSecureSecrets();
    await this.stateService.setDirectoryType(this.directory);
    await this.stateService.setDirectory(DirectoryType.Ldap, this.ldap);
    await this.stateService.setDirectory(DirectoryType.GSuite, this.gsuite);
    await this.stateService.setDirectory(DirectoryType.AzureActiveDirectory, this.azure);
    await this.stateService.setDirectory(DirectoryType.Okta, this.okta);
    await this.stateService.setDirectory(DirectoryType.OneLogin, this.oneLogin);
    await this.stateService.setSync(this.sync);
  }

  parseKeyFile() {
    const filePicker = document.getElementById("keyFile") as HTMLInputElement;
    if (filePicker.files == null || filePicker.files.length < 0) {
      return;
    }

    const reader = new FileReader();
    reader.readAsText(filePicker.files[0], "utf-8");
    reader.onload = (evt) => {
      this.ngZone.run(async () => {
        try {
          const result = JSON.parse((evt.target as FileReader).result as string);
          if (result.client_email != null && result.private_key != null) {
            this.gsuite.clientEmail = result.client_email;
            this.gsuite.privateKey = result.private_key;
          }
        } catch (e) {
          this.logService.error(e);
        }
        this.changeDetectorRef.detectChanges();
      });

      // reset file input
      // ref: https://stackoverflow.com/a/20552042
      filePicker.type = "";
      filePicker.type = "file";
      filePicker.value = "";
    };
  }

  setSslPath(id: string) {
    const filePicker = document.getElementById(id + "_file") as HTMLInputElement;
    if (filePicker.files == null || filePicker.files.length < 0) {
      return;
    }

    (this.ldap as any)[id] = filePicker.files[0].path;
    // reset file input
    // ref: https://stackoverflow.com/a/20552042
    filePicker.type = "";
    filePicker.type = "file";
    filePicker.value = "";
  }

  toggleLdapPassword() {
    this.showLdapPassword = !this.showLdapPassword;
    document.getElementById("password").focus();
  }

  toggleAzureKey() {
    this.showAzureKey = !this.showAzureKey;
    document.getElementById("secretKey").focus();
  }

  toggleOktaKey() {
    this.showOktaKey = !this.showOktaKey;
    document.getElementById("oktaToken").focus();
  }

  toggleOneLoginSecret() {
    this.showOneLoginSecret = !this.showOneLoginSecret;
    document.getElementById("oneLoginClientSecret").focus();
  }
}
