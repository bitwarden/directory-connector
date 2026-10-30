import { Injector } from "@angular/core";

import { EnvironmentService as EnvironmentServiceAbstraction } from "@/libs/abstractions/environment.service";
import { I18nService as I18nServiceAbstraction } from "@/libs/abstractions/i18n.service";
import { LogService as LogServiceAbstraction } from "@/libs/abstractions/log.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/services/state-service/default-state.service";

import { initFactory } from "./init.factory";

describe("initFactory", () => {
  let stateService: {
    init: jest.Mock;
    getAccessToken: jest.Mock;
    getOrganizationId: jest.Mock;
    clearAuthTokens: jest.Mock;
    getInstalledVersion: jest.Mock;
    setInstalledVersion: jest.Mock;
  };
  let logService: { error: jest.Mock };
  let i18nService: { init: jest.Mock; t: jest.Mock; translationLocale: string };
  let environmentService: { setUrlsFromStorage: jest.Mock };
  let platformUtilsService: { getDeviceString: jest.Mock; getApplicationVersion: jest.Mock };
  let injector: Injector;

  beforeEach(() => {
    stateService = {
      init: jest.fn().mockResolvedValue(undefined),
      // An access token with no organization id is the "data.json was deleted" state that
      // triggers the cleanup.
      getAccessToken: jest.fn().mockResolvedValue("stale-access-token"),
      getOrganizationId: jest.fn().mockResolvedValue(null),
      clearAuthTokens: jest.fn().mockResolvedValue(undefined),
      getInstalledVersion: jest.fn().mockResolvedValue("2026.9.0"),
      setInstalledVersion: jest.fn().mockResolvedValue(undefined),
    };
    logService = { error: jest.fn() };
    i18nService = {
      init: jest.fn().mockResolvedValue(undefined),
      t: jest.fn().mockReturnValue("Bitwarden Directory Connector"),
      translationLocale: "en",
    };
    environmentService = { setUrlsFromStorage: jest.fn().mockResolvedValue(undefined) };
    platformUtilsService = {
      getDeviceString: jest.fn().mockReturnValue("macos"),
      getApplicationVersion: jest.fn().mockResolvedValue("2026.9.0"),
    };

    const providers = new Map<unknown, unknown>([
      [StateService, stateService],
      [LogServiceAbstraction, logService],
      [I18nServiceAbstraction, i18nService],
      [EnvironmentServiceAbstraction, environmentService],
      [PlatformUtilsServiceAbstraction, platformUtilsService],
    ]);
    injector = { get: (token: unknown) => providers.get(token) } as Injector;
  });

  it("clears stale auth tokens when an access token exists without an organization id", async () => {
    await initFactory(injector)();

    expect(stateService.clearAuthTokens).toHaveBeenCalled();
  });

  it("does not clear auth tokens when an organization id is present", async () => {
    stateService.getOrganizationId.mockResolvedValue("org-123");

    await initFactory(injector)();

    expect(stateService.clearAuthTokens).not.toHaveBeenCalled();
  });

  describe("when clearing stale auth tokens fails", () => {
    // Regression: this rejection used to escape the APP_INITIALIZER, which rejects Angular's
    // bootstrap and leaves the user with a blank window instead of the login screen.
    beforeEach(() => {
      stateService.clearAuthTokens.mockRejectedValue(
        new Error("Invalid attempt to change the owner of this item."),
      );
    });

    it("still resolves so the app can finish starting", async () => {
      await expect(initFactory(injector)()).resolves.toBeUndefined();
    });

    it("logs the failure", async () => {
      await initFactory(injector)();

      expect(logService.error).toHaveBeenCalledWith(
        expect.stringContaining("Invalid attempt to change the owner of this item."),
      );
    });

    it("still completes the remaining initialization steps", async () => {
      await initFactory(injector)();

      expect(environmentService.setUrlsFromStorage).toHaveBeenCalled();
      expect(i18nService.init).toHaveBeenCalled();
    });

    it("still records the installed version", async () => {
      stateService.getInstalledVersion.mockResolvedValue("2026.6.1");

      await initFactory(injector)();

      expect(stateService.setInstalledVersion).toHaveBeenCalledWith("2026.9.0");
    });
  });
});
