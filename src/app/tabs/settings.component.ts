import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from "@angular/core";
import { webUtils } from "electron";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";

import { StateServiceVNext } from "../../abstractions/state-vNext.service";
import { DirectoryType } from "../../enums/directoryType";
import { EntraIdConfiguration } from "../../models/entraIdConfiguration";
import { GSuiteConfiguration } from "../../models/gsuiteConfiguration";
import { LdapConfiguration } from "../../models/ldapConfiguration";
import { OktaConfiguration } from "../../models/oktaConfiguration";
import { OneLoginConfiguration } from "../../models/oneLoginConfiguration";
import { SyncConfiguration } from "../../models/syncConfiguration";
import { ConnectorUtils } from "../../utils";

@Component({
  selector: "app-settings",
  templateUrl: "settings.component.html",
  standalone: false,
})
export class SettingsComponent implements OnInit, OnDestroy {
  directory: DirectoryType;
  directoryType = DirectoryType;
  ldap = new LdapConfiguration();
  gsuite = new GSuiteConfiguration();
  entra = new EntraIdConfiguration();
  okta = new OktaConfiguration();
  oneLogin = new OneLoginConfiguration();
  sync = new SyncConfiguration();
  directoryOptions: any[];
  showLdapPassword = false;
  showEntraKey = false;
  showOktaKey = false;
  showOneLoginSecret = false;

  constructor(
    private i18nService: I18nService,
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private logService: LogService,
    private stateService: StateServiceVNext,
  ) {
    this.directoryOptions = [
      { name: this.i18nService.t("select"), value: null },
      { name: "Active Directory / LDAP", value: DirectoryType.Ldap },
      { name: "Entra ID", value: DirectoryType.EntraID },
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
    this.entra =
      (await this.stateService.getDirectory<EntraIdConfiguration>(DirectoryType.EntraID)) ||
      this.entra;
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
    await this.stateService.setDirectoryType(this.directory);
    await this.stateService.setDirectory(DirectoryType.Ldap, this.ldap);
    await this.stateService.setDirectory(DirectoryType.GSuite, this.gsuite);
    await this.stateService.setDirectory(DirectoryType.EntraID, this.entra);
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

    (this.ldap as any)[id] = webUtils.getPathForFile(filePicker.files[0]);
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

  toggleEntraKey() {
    this.showEntraKey = !this.showEntraKey;
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
