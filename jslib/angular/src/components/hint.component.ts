import { Router } from "@angular/router";

import { ApiService } from "jslib-common/abstractions/api.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { PasswordHintRequest } from "jslib-common/models/request/passwordHintRequest";

export class HintComponent {
  email = "";
  formPromise: Promise<any>;

  protected successRoute = "login";
  protected onSuccessfulSubmit: () => void;

  constructor(
    protected router: Router,
    protected i18nService: I18nService,
    protected apiService: ApiService,
    protected platformUtilsService: PlatformUtilsService,
    private logService: LogService
  ) {}

  async submit() {
    if (this.email == null || this.email === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("emailRequired")
      );
      return;
    }
    if (this.email.indexOf("@") === -1) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("invalidEmail")
      );
      return;
    }

    try {
      this.formPromise = this.apiService.postPasswordHint(new PasswordHintRequest(this.email));
      await this.formPromise;
      this.platformUtilsService.showToast("success", null, this.i18nService.t("masterPassSent"));
      if (this.onSuccessfulSubmit != null) {
        this.onSuccessfulSubmit();
      } else if (this.router != null) {
        this.router.navigate([this.successRoute]);
      }
    } catch (e) {
      this.logService.error(e);
    }
  }
}
