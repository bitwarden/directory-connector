import { NgClass } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  ViewContainerRef,
  inject,
  signal,
} from "@angular/core";
import { outputToObservable } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { takeUntil } from "rxjs";

import { AuthService } from "@/libs/abstractions/auth.service";
import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { Utils } from "@/libs/utils/utils";

import { A11yTitleDirective } from "@/src-gui/angular/directives/a11y-title.directive";
import { ApiActionDirective } from "@/src-gui/angular/directives/api-action.directive";
import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";
import { ModalService } from "@/src-gui/angular/services/modal.service";

import { EnvironmentComponent } from "./environment.component";

@Component({
  selector: "app-apiKey",
  templateUrl: "apiKey.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yTitleDirective, ApiActionDirective, FormsModule, I18nPipe, NgClass],
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

  clientId = signal("");
  clientSecret = signal("");
  formPromise = signal<Promise<any>>(null);
  showSecret = signal(false);

  readonly successRoute = "/tabs/dashboard";

  private authService = inject(AuthService);
  private router = inject(Router);
  private i18nService = inject(I18nService);
  private platformUtilsService = inject(PlatformUtilsService);
  private modalService = inject(ModalService);
  private logService = inject(LogService);
  private stateService = inject(StateService);

  async submit() {
    const clientId = this.clientId();
    const clientSecret = this.clientSecret();

    if (clientId == null || clientId === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("clientIdRequired"),
      );
      return;
    }
    if (!clientId.startsWith("organization")) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("orgApiKeyRequired"),
      );
      return;
    }
    if (clientSecret == null || clientSecret === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("clientSecretRequired"),
      );
      return;
    }
    const idParts = clientId.split(".");

    if (idParts.length !== 2 || idParts[0] !== "organization" || !Utils.isGuid(idParts[1])) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("invalidClientId"),
      );
      return;
    }

    try {
      const promise = this.authService.logIn({ clientId, clientSecret });
      this.formPromise.set(promise);
      await promise;
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

    outputToObservable(childComponent.onSaved)
      .pipe(takeUntil(modalRef.onClosed))
      .subscribe(() => {
        modalRef.close();
      });
  }

  toggleSecret() {
    this.showSecret.update((v) => !v);
    document.getElementById("client_secret").focus();
  }
}
