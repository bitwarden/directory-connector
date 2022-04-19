import { Directive, OnInit } from "@angular/core";

import { ApiService } from "jslib-common/abstractions/api.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "jslib-common/abstractions/state.service";

@Directive()
export class PremiumComponent implements OnInit {
  isPremium = false;
  price = 10;
  refreshPromise: Promise<any>;

  constructor(
    protected i18nService: I18nService,
    protected platformUtilsService: PlatformUtilsService,
    protected apiService: ApiService,
    private logService: LogService,
    protected stateService: StateService
  ) {}

  async ngOnInit() {
    this.isPremium = await this.stateService.getCanAccessPremium();
  }

  async refresh() {
    try {
      this.refreshPromise = this.apiService.refreshIdentityToken();
      await this.refreshPromise;
      this.platformUtilsService.showToast("success", null, this.i18nService.t("refreshComplete"));
      this.isPremium = await this.stateService.getCanAccessPremium();
    } catch (e) {
      this.logService.error(e);
    }
  }

  async purchase() {
    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("premiumPurchaseAlert"),
      this.i18nService.t("premiumPurchase"),
      this.i18nService.t("yes"),
      this.i18nService.t("cancel")
    );
    if (confirmed) {
      this.platformUtilsService.launchUri("https://vault.bitwarden.com/#/?premium=purchase");
    }
  }

  async manage() {
    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("premiumManageAlert"),
      this.i18nService.t("premiumManage"),
      this.i18nService.t("yes"),
      this.i18nService.t("cancel")
    );
    if (confirmed) {
      this.platformUtilsService.launchUri("https://vault.bitwarden.com/#/?premium=manage");
    }
  }
}
