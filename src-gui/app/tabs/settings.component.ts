import { NgClass } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { webUtils } from "electron";

import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { DirectoryConnectorProfileSummary } from "@/libs/models/directoryConnectorProfile";
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

  profiles = signal<DirectoryConnectorProfileSummary[]>([]);
  activeProfileId = signal<string>(null);
  activeProfileName = signal<string>("");

  private i18nService = inject(I18nService);
  private logService = inject(LogService);
  private platformUtilsService = inject(PlatformUtilsService);
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
    await this.loadProfiles();
    await this.loadForm();
  }

  async ngOnDestroy() {
    await this.submit();
  }

  private async loadForm() {
    this.directory.set(await this.stateService.getDirectoryType());
    this.ldap.set(
      (await this.stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap)) ||
        new LdapConfiguration(),
    );
    this.gsuite.set(
      (await this.stateService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite)) ||
        new GSuiteConfiguration(),
    );
    this.entra.set(
      (await this.stateService.getDirectory<EntraIdConfiguration>(DirectoryType.EntraID)) ||
        new EntraIdConfiguration(),
    );
    this.okta.set(
      (await this.stateService.getDirectory<OktaConfiguration>(DirectoryType.Okta)) ||
        new OktaConfiguration(),
    );
    this.oneLogin.set(
      (await this.stateService.getDirectory<OneLoginConfiguration>(DirectoryType.OneLogin)) ||
        new OneLoginConfiguration(),
    );
    this.sync.set((await this.stateService.getSync()) || new SyncConfiguration());
  }

  private async loadProfiles() {
    const profiles = await this.stateService.getDirectoryProfiles();
    const activeId = await this.stateService.getActiveDirectoryProfileId();
    this.profiles.set(profiles);
    this.activeProfileId.set(activeId);
    this.activeProfileName.set(profiles.find((p) => p.id === activeId)?.name ?? "");
  }

  /** Persists any pending edits (including a renamed profile) to the currently active profile. */
  private async saveActiveProfileName() {
    const id = this.activeProfileId();
    const name = this.activeProfileName()?.trim();
    if (id == null || name === "" || name == null) {
      return;
    }
    await this.stateService.renameDirectoryProfile(id, name);
  }

  async selectProfile(id: string) {
    if (id == null || id === this.activeProfileId()) {
      return;
    }
    // Persist any in-progress edits to the currently active profile before switching away.
    await this.submit();
    await this.stateService.switchDirectoryProfile(id);
    await this.loadProfiles();
    await this.loadForm();
  }

  async createProfile() {
    await this.submit();
    const id = await this.stateService.createDirectoryProfile(this.i18nService.t("newProfile"));
    await this.loadProfiles();
    await this.loadForm();
    document.getElementById("profileName")?.focus();
    return id;
  }

  async deleteActiveProfile() {
    const id = this.activeProfileId();
    if (id == null) {
      return;
    }
    if (this.profiles().length <= 1) {
      this.platformUtilsService.showToast(
        "error",
        null,
        this.i18nService.t("cannotDeleteLastProfile"),
      );
      return;
    }

    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("deleteProfileConfirmation", this.activeProfileName()),
      this.i18nService.t("deleteProfile"),
      this.i18nService.t("yes"),
      this.i18nService.t("cancel"),
    );
    if (!confirmed) {
      return;
    }

    await this.stateService.deleteDirectoryProfile(id);
    await this.loadProfiles();
    await this.loadForm();
  }

  userFilterHelp = computed(() => {
    switch (this.directory()) {
      case DirectoryType.Ldap:
        return this.i18nService.t("userFilterHelpLdap");
      case DirectoryType.EntraID:
        return this.i18nService.t("userFilterHelpEntraId");
      case DirectoryType.Okta:
        return this.i18nService.t("userFilterHelpOkta");
      case DirectoryType.GSuite:
        return this.i18nService.t("userFilterHelpGSuite");
      case DirectoryType.OneLogin:
        return this.i18nService.t("userFilterHelpOneLogin");
      default:
        return "";
    }
  });

  async submit() {
    const ldap = this.ldap();
    const sync = this.sync();
    ConnectorUtils.adjustConfigForSave(ldap, sync);
    if (ldap != null && ldap.ad) {
      ldap.pagedSearch = true;
    }
    await this.saveActiveProfileName();
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
