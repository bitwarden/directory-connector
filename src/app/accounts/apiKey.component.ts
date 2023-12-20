import { Component, Input, ViewChild, ViewContainerRef } from "@angular/core";
import { Router } from "@angular/router";

import { ModalService } from "@/jslib/angular/src/services/modal.service";
import { AuthService } from "@/jslib/common/src/abstractions/auth.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { Utils } from "@/jslib/common/src/misc/utils";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";

import { StateService } from "../../abstractions/state.service";

import { EnvironmentComponent } from "./environment.component";

@Component({
  selector: "app-apiKey",
  templateUrl: "apiKey.component.html",
})
export class ApiKeyComponent {
  @ViewChild("environment", { read: ViewContainerRef, static: true })
  environmentModal: ViewContainerRef;
  @Input() clientId = "";
  @Input() clientSecret = "";

  formPromise: Promise<any>;
  successRoute = "/tabs/dashboard";
  showSecret = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private i18nService: I18nService,
    private platformUtilsService: PlatformUtilsService,
    private modalService: ModalService,
    private logService: LogService,
    private stateService: StateService
  ) {}

  async submit() {
    if (this.clientId == null || this.clientId === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("clientIdRequired")
      );
      return;
    }
    if (!this.clientId.startsWith("organization")) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("orgApiKeyRequired")
      );
      return;
    }
    if (this.clientSecret == null || this.clientSecret === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("clientSecretRequired")
      );
      return;
    }
    const idParts = this.clientId.split(".");

    if (idParts.length !== 2 || idParts[0] !== "organization" || !Utils.isGuid(idParts[1])) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("invalidClientId")
      );
      return;
    }

    try {
      this.formPromise = this.authService.logIn(
        new ApiLogInCredentials(this.clientId, this.clientSecret)
      );
      await this.formPromise;
      const organizationId = await this.stateService.getEntityId();
      await this.stateService.setOrganizationId(organizationId);
      this.router.navigate([this.successRoute]);
    } catch (e) {
      this.logService.error(e);
    }
  }

  async settings() {
    const [modalRef, childComponent] = await this.modalService.openViewRef(
      EnvironmentComponent,
      this.environmentModal
    );

    childComponent.onSaved.subscribe(() => {
      modalRef.close();
    });
  }
  toggleSecret() {
    this.showSecret = !this.showSecret;
    document.getElementById("client_secret").focus();
  }
}
