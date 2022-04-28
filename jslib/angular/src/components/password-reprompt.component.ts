import { Directive } from "@angular/core";

import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";

import { ModalRef } from "./modal/modal.ref";

/**
 * Used to verify the user's Master Password for the "Master Password Re-prompt" feature only.
 * See UserVerificationComponent for any other situation where you need to verify the user's identity.
 */
@Directive()
export class PasswordRepromptComponent {
  showPassword = false;
  masterPassword = "";

  constructor(
    private modalRef: ModalRef,
    private cryptoService: CryptoService,
    private platformUtilsService: PlatformUtilsService,
    private i18nService: I18nService
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async submit() {
    if (!(await this.cryptoService.compareAndUpdateKeyHash(this.masterPassword, null))) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("invalidMasterPassword")
      );
      return;
    }

    this.modalRef.close(true);
  }
}
