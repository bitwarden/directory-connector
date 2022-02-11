import { Component, Input, ViewChild, ViewContainerRef } from "@angular/core";
import { Router } from "@angular/router";

import { EnvironmentComponent } from "./environment.component";

import { AuthService } from "jslib-common/abstractions/auth.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";

import { StateService } from "../../abstractions/state.service";

import { ModalService } from "jslib-angular/services/modal.service";

import { Utils } from "jslib-common/misc/utils";
import { ApiLogInCredentials } from "jslib-common/models/domain/logInCredentials";

@Component({
  selector: "app-apiKey",
  templateUrl: "apiKey.component.html",
})
export class ApiKeyComponent {
  @ViewChild("environment", { read: ViewContainerRef, static: true })
  environmentModal: ViewContainerRef;
  @Input() clientId: string = "";
  @Input() clientSecret: string = "";

  formPromise: Promise<any>;
  successRoute = "/tabs/dashboard";
  showSecret: boolean = false;

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
