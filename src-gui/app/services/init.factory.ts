import { Injector } from "@angular/core";

import { EnvironmentService as EnvironmentServiceAbstraction } from "@/libs/abstractions/environment.service";
import { I18nService as I18nServiceAbstraction } from "@/libs/abstractions/i18n.service";
import { LogService as LogServiceAbstraction } from "@/libs/abstractions/log.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/services/state-service/default-state.service";

import { RendererI18nService } from "@/src-gui/services/electron/rendererI18n.service";

export function initFactory(injector: Injector): () => Promise<void> {
  return async () => {
    const stateService = injector.get(StateService);
    const i18nService = injector.get(I18nServiceAbstraction);
    const platformUtilsService = injector.get(PlatformUtilsServiceAbstraction);
    const environmentService = injector.get(EnvironmentServiceAbstraction);
    const logService = injector.get(LogServiceAbstraction);

    await stateService.init();

    // If auth tokens exist but org config is missing (e.g. data.json was deleted),
    // clear tokens so the user is forced back to the login screen.
    //
    // This cleanup is best-effort housekeeping and must never block startup: secure storage can
    // reject for reasons outside our control (on macOS, a keychain item whose ACL no longer
    // trusts this process). Letting that escape would reject the APP_INITIALIZER and leave the
    // user with a blank window instead of the login screen. The check is idempotent, so a
    // failure here simply retries on the next launch.
    const accessToken = await stateService.getAccessToken();
    const organizationId = await stateService.getOrganizationId();
    if (accessToken != null && organizationId == null) {
      try {
        await stateService.clearAuthTokens();
      } catch (e) {
        logService.error(
          "Failed to clear stale auth tokens; showing the login screen and retrying on next launch: " +
            (e instanceof Error ? e.message : String(e)),
        );
      }
    }

    await environmentService.setUrlsFromStorage();
    await (i18nService as RendererI18nService).init();
    const htmlEl = window.document.documentElement;
    htmlEl.classList.add("os_" + platformUtilsService.getDeviceString());
    htmlEl.classList.add("locale_" + i18nService.translationLocale);
    window.document.title = i18nService.t("bitwardenDirectoryConnector");

    let installAction = null;
    const installedVersion = await stateService.getInstalledVersion();
    const currentVersion = await platformUtilsService.getApplicationVersion();
    if (installedVersion == null) {
      installAction = "install";
    } else if (installedVersion !== currentVersion) {
      installAction = "update";
    }

    if (installAction != null) {
      await stateService.setInstalledVersion(currentVersion);
    }
  };
}
