import { Directive, Input } from "@angular/core";

import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { CaptchaIFrame } from "jslib-common/misc/captcha_iframe";
import { Utils } from "jslib-common/misc/utils";

@Directive()
export abstract class CaptchaProtectedComponent {
  @Input() captchaSiteKey: string = null;
  captchaToken: string = null;
  captcha: CaptchaIFrame;

  constructor(
    protected environmentService: EnvironmentService,
    protected i18nService: I18nService,
    protected platformUtilsService: PlatformUtilsService
  ) {}

  async setupCaptcha() {
    const webVaultUrl = this.environmentService.getWebVaultUrl();

    this.captcha = new CaptchaIFrame(
      window,
      webVaultUrl,
      this.i18nService,
      (token: string) => {
        this.captchaToken = token;
      },
      (error: string) => {
        this.platformUtilsService.showToast("error", this.i18nService.t("errorOccurred"), error);
      },
      (info: string) => {
        this.platformUtilsService.showToast("info", this.i18nService.t("info"), info);
      }
    );
  }

  showCaptcha() {
    return !Utils.isNullOrWhitespace(this.captchaSiteKey);
  }

  protected handleCaptchaRequired(response: { captchaSiteKey: string }): boolean {
    if (Utils.isNullOrWhitespace(response.captchaSiteKey)) {
      return false;
    }

    this.captchaSiteKey = response.captchaSiteKey;
    this.captcha.init(response.captchaSiteKey);
    return true;
  }
}
