import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { EnvironmentService, EnvironmentUrls } from "@/libs/abstractions/environment.service";
import { I18nService } from "@/libs/abstractions/i18n.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";

import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";

@Component({
  selector: "app-environment",
  templateUrl: "environment.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, I18nPipe],
})
export class EnvironmentComponent implements OnInit {
  onSaved = output();

  identityUrl = signal("");
  apiUrl = signal("");
  webVaultUrl = signal("");
  baseUrl = signal("");
  showCustom = signal(false);

  private platformUtilsService = inject(PlatformUtilsService);
  private environmentService = inject(EnvironmentService);
  private i18nService = inject(I18nService);
  private stateService = inject(StateService);

  async ngOnInit(): Promise<void> {
    const urls = await this.stateService.getEnvironmentUrls();

    this.baseUrl.set(urls?.base || "");
    this.webVaultUrl.set(urls?.webVault || "");
    this.apiUrl.set(urls?.api || "");
    this.identityUrl.set(urls?.identity || "");
  }

  async submit(): Promise<void> {
    const urls: EnvironmentUrls = {
      base: this.baseUrl(),
      api: this.apiUrl(),
      identity: this.identityUrl(),
      webVault: this.webVaultUrl(),
    };

    await this.environmentService.setUrls(urls);

    // Reload from state to get normalized URLs (with https:// prefix, etc.)
    const normalizedUrls = await this.stateService.getEnvironmentUrls();
    this.baseUrl.set(normalizedUrls?.base || "");
    this.apiUrl.set(normalizedUrls?.api || "");
    this.identityUrl.set(normalizedUrls?.identity || "");
    this.webVaultUrl.set(normalizedUrls?.webVault || "");

    this.platformUtilsService.showToast("success", null, this.i18nService.t("environmentSaved"));
    this.onSaved.emit();
  }

  toggleCustom(): void {
    this.showCustom.update((v) => !v);
  }
}
