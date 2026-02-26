import { Component, EventEmitter, OnInit, Output } from "@angular/core";

import { EnvironmentService, EnvironmentUrls } from "@/libs/abstractions/environment.service";
import { StateService } from "@/libs/abstractions/state.service";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";

@Component({
  selector: "app-environment",
  templateUrl: "environment.component.html",
  standalone: false,
})
export class EnvironmentComponent implements OnInit {
  @Output() onSaved = new EventEmitter();

  identityUrl: string;
  apiUrl: string;
  webVaultUrl: string;
  baseUrl: string;
  showCustom = false;

  constructor(
    private platformUtilsService: PlatformUtilsService,
    private environmentService: EnvironmentService,
    private i18nService: I18nService,
    private stateService: StateService,
  ) {}

  async ngOnInit(): Promise<void> {
    // Load environment URLs from state
    const urls = await this.stateService.getEnvironmentUrls();

    this.baseUrl = urls?.base || "";
    this.webVaultUrl = urls?.webVault || "";
    this.apiUrl = urls?.api || "";
    this.identityUrl = urls?.identity || "";
  }

  async submit(): Promise<void> {
    const urls: EnvironmentUrls = {
      base: this.baseUrl,
      api: this.apiUrl,
      identity: this.identityUrl,
      webVault: this.webVaultUrl,
    };

    await this.environmentService.setUrls(urls);

    // Reload from state to get normalized URLs (with https:// prefix, etc.)
    const normalizedUrls = await this.stateService.getEnvironmentUrls();
    this.baseUrl = normalizedUrls?.base || "";
    this.apiUrl = normalizedUrls?.api || "";
    this.identityUrl = normalizedUrls?.identity || "";
    this.webVaultUrl = normalizedUrls?.webVault || "";

    this.platformUtilsService.showToast("success", null, this.i18nService.t("environmentSaved"));
    this.onSaved.emit();
  }

  toggleCustom(): void {
    this.showCustom = !this.showCustom;
  }
}
