import { Component, Input, ViewChild, ViewContainerRef } from "@angular/core";
import { Router } from "@angular/router";
import { takeUntil } from "rxjs";

import { ModalService } from "@/jslib/angular/src/services/modal.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { Utils } from "@/jslib/common/src/misc/utils";

import { AuthService } from "../../abstractions/auth.service";
import { StateService } from "../../abstractions/state.service";

import { EnvironmentComponent } from "./environment.component";

@Component({
  selector: "app-apiKey",
  templateUrl: "apiKey.component.html",
  standalone: false,
})
// There is an eslint exception made here due to semantics.
// The eslint rule expects a typical takeUntil() pattern involving component destruction.
// The only subscription in this component is closed from a child component, confusing eslint.
// https://github.com/cartant/eslint-plugin-rxjs-angular/blob/main/docs/rules/prefer-takeuntil.md
//
// eslint-disable-next-line rxjs-angular-x/prefer-takeuntil
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
    private stateService: StateService,
  ) {}

  async submit() {
    if (this.clientId == null || this.clientId === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("clientIdRequired"),
      );
      return;
    }
    if (!this.clientId.startsWith("organization")) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("orgApiKeyRequired"),
      );
      return;
    }
    if (this.clientSecret == null || this.clientSecret === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("clientSecretRequired"),
      );
      return;
    }
    const idParts = this.clientId.split(".");

    if (idParts.length !== 2 || idParts[0] !== "organization" || !Utils.isGuid(idParts[1])) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("invalidClientId"),
      );
      return;
    }

    try {
      this.formPromise = this.authService.logIn({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });
      await this.formPromise;
      const organizationId = await this.stateService.getEntityId();
      await this.stateService.setOrganizationId(organizationId);
      this.router.navigate([this.successRoute]);
    } catch (e) {
      this.logService.error(e);
    }
  }

  async settings() {
    const [modalRef, childComponent] = await this.modalService.openViewRef<EnvironmentComponent>(
      EnvironmentComponent,
      this.environmentModal,
    );

    // eslint-disable-next-line rxjs-angular-x/prefer-takeuntil
    childComponent.onSaved.pipe(takeUntil(modalRef.onClosed)).subscribe(() => {
      modalRef.close();
    });
  }

  toggleSecret() {
    this.showSecret = !this.showSecret;
    document.getElementById("client_secret").focus();
  }
}
