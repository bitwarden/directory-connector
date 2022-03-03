import { Component } from "@angular/core";

import { EnvironmentComponent as BaseEnvironmentComponent } from "jslib-angular/components/environment.component";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";

@Component({
  selector: "app-environment",
  templateUrl: "environment.component.html",
})
export class EnvironmentComponent extends BaseEnvironmentComponent {
  constructor(
    environmentService: EnvironmentService,
    i18nService: I18nService,
    platformUtilsService: PlatformUtilsService
  ) {
    super(platformUtilsService, environmentService, i18nService);
  }
}
