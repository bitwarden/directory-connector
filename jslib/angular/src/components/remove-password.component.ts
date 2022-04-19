import { Directive, OnInit } from "@angular/core";
import { Router } from "@angular/router";

import { ApiService } from "jslib-common/abstractions/api.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { SyncService } from "jslib-common/abstractions/sync.service";
import { Organization } from "jslib-common/models/domain/organization";

@Directive()
export class RemovePasswordComponent implements OnInit {
  actionPromise: Promise<any>;
  continuing = false;
  leaving = false;

  loading = true;
  organization: Organization;
  email: string;

  constructor(
    private router: Router,
    private stateService: StateService,
    private apiService: ApiService,
    private syncService: SyncService,
    private platformUtilsService: PlatformUtilsService,
    private i18nService: I18nService,
    private keyConnectorService: KeyConnectorService
  ) {}

  async ngOnInit() {
    this.organization = await this.keyConnectorService.getManagingOrganization();
    this.email = await this.stateService.getEmail();
    await this.syncService.fullSync(false);
    this.loading = false;
  }

  async convert() {
    this.continuing = true;
    this.actionPromise = this.keyConnectorService.migrateUser();

    try {
      await this.actionPromise;
      this.platformUtilsService.showToast(
        "success",
        null,
        this.i18nService.t("removedMasterPassword")
      );
      await this.keyConnectorService.removeConvertAccountRequired();
      this.router.navigate([""]);
    } catch (e) {
      this.platformUtilsService.showToast("error", this.i18nService.t("errorOccurred"), e.message);
    }
  }

  async leave() {
    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("leaveOrganizationConfirmation"),
      this.organization.name,
      this.i18nService.t("yes"),
      this.i18nService.t("no"),
      "warning"
    );
    if (!confirmed) {
      return false;
    }

    try {
      this.leaving = true;
      this.actionPromise = this.apiService.postLeaveOrganization(this.organization.id).then(() => {
        return this.syncService.fullSync(true);
      });
      await this.actionPromise;
      this.platformUtilsService.showToast("success", null, this.i18nService.t("leftOrganization"));
      await this.keyConnectorService.removeConvertAccountRequired();
      this.router.navigate([""]);
    } catch (e) {
      this.platformUtilsService.showToast("error", this.i18nService.t("errorOccurred"), e);
    }
  }
}
