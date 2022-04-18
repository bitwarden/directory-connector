import { Injectable } from "@angular/core";

import { CryptoService as CryptoServiceAbstraction } from "jslib-common/abstractions/crypto.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "jslib-common/abstractions/environment.service";
import { I18nService as I18nServiceAbstraction } from "jslib-common/abstractions/i18n.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "jslib-common/abstractions/platformUtils.service";
import { ContainerService } from "jslib-common/services/container.service";

import { I18nService } from "src/services/i18n.service";

import { StateService as StateServiceAbstraction } from "../../abstractions/state.service";

@Injectable()
export class InitService {
  constructor(
    private environmentService: EnvironmentServiceAbstraction,
    private i18nService: I18nServiceAbstraction,
    private platformUtilsService: PlatformUtilsServiceAbstraction,
    private stateService: StateServiceAbstraction,
    private cryptoService: CryptoServiceAbstraction
  ) {}

  init() {
    return async () => {
      await this.stateService.init();
      await this.environmentService.setUrlsFromStorage();
      await (this.i18nService as I18nService).init();
      const htmlEl = window.document.documentElement;
      htmlEl.classList.add("os_" + this.platformUtilsService.getDeviceString());
      htmlEl.classList.add("locale_" + this.i18nService.translationLocale);
      window.document.title = this.i18nService.t("bitwardenDirectoryConnector");

      let installAction = null;
      const installedVersion = await this.stateService.getInstalledVersion();
      const currentVersion = await this.platformUtilsService.getApplicationVersion();
      if (installedVersion == null) {
        installAction = "install";
      } else if (installedVersion !== currentVersion) {
        installAction = "update";
      }

      if (installAction != null) {
        await this.stateService.setInstalledVersion(currentVersion);
      }

      const containerService = new ContainerService(this.cryptoService);
      containerService.attachToWindow(window);
    };
  }
}
