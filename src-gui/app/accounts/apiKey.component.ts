import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

import {
  ButtonModule,
  CardComponent,
  DialogService,
  FormFieldModule,
  IconButtonModule,
  IconTileComponent,
  LinkModule,
  TypographyModule,
} from "@bitwarden/components";

import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { Utils } from "@/libs/utils/utils";

import { ApiActionDirective } from "@/src-gui/angular/directives/api-action.directive";
import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";
import { RendererAuthService } from "@/src-gui/services/electron/rendererAuth.service";

import { EnvironmentComponent } from "./environment.component";

@Component({
  selector: "app-apiKey",
  templateUrl: "apiKey.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ApiActionDirective,
    ButtonModule,
    CardComponent,
    FormFieldModule,
    FormsModule,
    I18nPipe,
    IconButtonModule,
    IconTileComponent,
    LinkModule,
    TypographyModule,
  ],
})
export class ApiKeyComponent {
  clientId = signal("");
  clientSecret = signal("");
  formPromise = signal<Promise<any>>(null);

  readonly successRoute = "/tabs/dashboard";

  private router = inject(Router);
  private authService = inject(RendererAuthService);
  private i18nService = inject(I18nService);
  private platformUtilsService = inject(PlatformUtilsService);
  private dialogService = inject(DialogService);
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

  settings() {
    this.dialogService.open(EnvironmentComponent);
  }
}
