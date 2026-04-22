import { NgClass } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
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

import { A11yTitleDirective } from "@/src-gui/angular/directives/a11y-title.directive";
import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";

@Component({
  selector: "app-settings",
  templateUrl: "settings.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yTitleDirective, FormsModule, I18nPipe, NgClass],
})
export class SettingsComponent implements OnInit, OnDestroy {
  directory = signal<DirectoryType>(null);

  readonly directoryType = DirectoryType;
  readonly directoryOptions: { name: string; value: DirectoryType | null }[];

  ldap = signal(new LdapConfiguration());
  gsuite = signal(new GSuiteConfiguration());
  entra = signal(new EntraIdConfiguration());
  okta = signal(new OktaConfiguration());
  oneLogin = signal(new OneLoginConfiguration());
  sync = signal(new SyncConfiguration());

  showLdapPassword = signal(false);
  showEntraKey = signal(false);
  showOktaKey = signal(false);
  showOneLoginSecret = signal(false);

  private i18nService = inject(I18nService);
  private logService = inject(LogService);
  private stateService = inject(StateService);

  constructor() {
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
    const ldap = this.ldap();
    const sync = this.sync();
    ConnectorUtils.adjustConfigForSave(ldap, sync);
    if (ldap != null && ldap.ad) {
      ldap.pagedSearch = true;
    }
    await this.stateService.setDirectoryType(this.directory());
    await this.stateService.setDirectory(DirectoryType.Ldap, ldap);
    await this.stateService.setDirectory(DirectoryType.GSuite, this.gsuite());
    await this.stateService.setDirectory(DirectoryType.EntraID, this.entra());
    await this.stateService.setDirectory(DirectoryType.Okta, this.okta());
    await this.stateService.setDirectory(DirectoryType.OneLogin, this.oneLogin());
    await this.stateService.setSync(sync);
  }

  parseKeyFile() {
    const filePicker = document.getElementById("keyFile") as HTMLInputElement;
    if (filePicker.files == null || filePicker.files.length < 0) {
      return;
    }

    const reader = new FileReader();
    reader.readAsText(filePicker.files[0], "utf-8");
    reader.onload = async (evt) => {
      try {
        const result = JSON.parse((evt.target as FileReader).result as string);
        if (result.client_email != null && result.private_key != null) {
          this.gsuite.update((current) => ({
            ...current,
            clientEmail: result.client_email,
            privateKey: result.private_key,
          }));
        }
      } catch (e) {
        this.logService.error(e);
      }

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

    const path = webUtils.getPathForFile(filePicker.files[0]);
    this.ldap.update((current) => ({ ...current, [id]: path }));
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
