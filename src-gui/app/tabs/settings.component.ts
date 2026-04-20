import { Component, NgZone, OnDestroy, OnInit, signal } from "@angular/core";
import { webUtils } from "electron";

import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { StateService } from "@/libs/abstractions/state.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { EntraIdConfiguration } from "@/libs/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/libs/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/libs/models/ldapConfiguration";
import { OktaConfiguration } from "@/libs/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/libs/models/oneLoginConfiguration";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";
import { ConnectorUtils } from "@/libs/utils";

@Component({
  selector: "app-settings",
  templateUrl: "settings.component.html",
  standalone: false,
})
export class SettingsComponent implements OnInit, OnDestroy {
  directory = signal<DirectoryType>(null);
  directoryType = DirectoryType;
  ldap = signal(new LdapConfiguration());
  gsuite = signal(new GSuiteConfiguration());
  entra = signal(new EntraIdConfiguration());
  okta = signal(new OktaConfiguration());
  oneLogin = signal(new OneLoginConfiguration());
  sync = signal(new SyncConfiguration());
  directoryOptions = signal<{ name: string; value: DirectoryType | null }[]>([]);
  showLdapPassword = signal(false);
  showEntraKey = signal(false);
  showOktaKey = signal(false);
  showOneLoginSecret = signal(false);

  constructor(
    private i18nService: I18nService,
    private ngZone: NgZone,
    private logService: LogService,
    private stateService: StateService,
  ) {
    this.directoryOptions.set([
      { name: this.i18nService.t("select"), value: null },
      { name: "Active Directory / LDAP", value: DirectoryType.Ldap },
      { name: "Entra ID", value: DirectoryType.EntraID },
      { name: "G Suite (Google)", value: DirectoryType.GSuite },
      { name: "Okta", value: DirectoryType.Okta },
      { name: "OneLogin", value: DirectoryType.OneLogin },
    ]);
  }

  async ngOnInit() {
    this.directory.set(await this.stateService.getDirectoryType());
    this.ldap.set(
      (await this.stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap)) || this.ldap(),
    );
    this.gsuite.set(
      (await this.stateService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite)) ||
        this.gsuite(),
    );
    this.entra.set(
      (await this.stateService.getDirectory<EntraIdConfiguration>(DirectoryType.EntraID)) ||
        this.entra(),
    );
    this.okta.set(
      (await this.stateService.getDirectory<OktaConfiguration>(DirectoryType.Okta)) || this.okta(),
    );
    this.oneLogin.set(
      (await this.stateService.getDirectory<OneLoginConfiguration>(DirectoryType.OneLogin)) ||
        this.oneLogin(),
    );
    this.sync.set((await this.stateService.getSync()) || this.sync());
  }

  async ngOnDestroy() {
    await this.submit();
  }

  async submit() {
    ConnectorUtils.adjustConfigForSave(this.ldap(), this.sync());
    if (this.ldap() != null && this.ldap().ad) {
      this.ldap().pagedSearch = true;
    }
    await this.stateService.setDirectoryType(this.directory());
    await this.stateService.setDirectory(DirectoryType.Ldap, this.ldap());
    await this.stateService.setDirectory(DirectoryType.GSuite, this.gsuite());
    await this.stateService.setDirectory(DirectoryType.EntraID, this.entra());
    await this.stateService.setDirectory(DirectoryType.Okta, this.okta());
    await this.stateService.setDirectory(DirectoryType.OneLogin, this.oneLogin());
    await this.stateService.setSync(this.sync());
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
            this.gsuite().clientEmail = result.client_email;
            this.gsuite().privateKey = result.private_key;
          }
        } catch (e) {
          this.logService.error(e);
        }
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

    (this.ldap() as any)[id] = webUtils.getPathForFile(filePicker.files[0]);
    // reset file input
    // ref: https://stackoverflow.com/a/20552042
    filePicker.type = "";
    filePicker.type = "file";
    filePicker.value = "";
  }

  toggleLdapPassword() {
    this.showLdapPassword.update((v) => !v);
    document.getElementById("password").focus();
  }

  toggleEntraKey() {
    this.showEntraKey.update((v) => !v);
    document.getElementById("secretKey").focus();
  }

  toggleOktaKey() {
    this.showOktaKey.update((v) => !v);
    document.getElementById("oktaToken").focus();
  }

  toggleOneLoginSecret() {
    this.showOneLoginSecret.update((v) => !v);
    document.getElementById("oneLoginClientSecret").focus();
  }
}
