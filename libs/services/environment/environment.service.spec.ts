import { mock, MockProxy } from "jest-mock-extended";

import { StateService } from "@/libs/abstractions/state.service";
import { EnvironmentUrls } from "@/libs/models/domain/environmentUrls";

import { DefaultEnvironmentService } from "./environment.service";

const CLOUD_IDENTITY = "https://identity.bitwarden.com";
const CLOUD_API = "https://api.bitwarden.com";
const SELF_HOSTED = "https://vault.example.com";

describe("DefaultEnvironmentService", () => {
  let stateService: MockProxy<StateService>;
  let sut: DefaultEnvironmentService;

  beforeEach(() => {
    stateService = mock<StateService>();
    sut = new DefaultEnvironmentService(stateService);
  });

  /**
   * A constructor cannot await, so this service's cached URLs are not populated until a caller
   * awaits setUrlsFromStorage(). Outbound requests do not depend on that cache — ApiService
   * reads the URLs from StateService on every request — but the cache still backs the settings
   * UI, so these tests pin down that it is only correct after an explicit load.
   */
  describe("before the URLs are loaded", () => {
    it("returns the cloud defaults", () => {
      expect(sut.getIdentityUrl()).toBe(CLOUD_IDENTITY);
      expect(sut.getApiUrl()).toBe(CLOUD_API);
      expect(sut.hasBaseUrl()).toBe(false);
    });

    it("does not read storage until asked", () => {
      expect(stateService.getEnvironmentUrls).not.toHaveBeenCalled();
    });
  });

  describe("setUrlsFromStorage", () => {
    it("derives the identity and api urls from a stored base url", async () => {
      stateService.getEnvironmentUrls.mockResolvedValue({
        base: SELF_HOSTED,
        api: null,
        identity: null,
        webVault: null,
      } as EnvironmentUrls);

      await sut.setUrlsFromStorage();

      expect(sut.getIdentityUrl()).toBe(`${SELF_HOSTED}/identity`);
      expect(sut.getApiUrl()).toBe(`${SELF_HOSTED}/api`);
      expect(sut.hasBaseUrl()).toBe(true);
    });

    it("prefers explicit identity and api urls over the base url", async () => {
      stateService.getEnvironmentUrls.mockResolvedValue({
        base: SELF_HOSTED,
        api: "https://api.example.com",
        identity: "https://identity.example.com",
        webVault: null,
      } as EnvironmentUrls);

      await sut.setUrlsFromStorage();

      expect(sut.getIdentityUrl()).toBe("https://identity.example.com");
      expect(sut.getApiUrl()).toBe("https://api.example.com");
    });

    it("leaves the cloud defaults in place when storage holds no urls", async () => {
      // The fresh-install case: nothing has been configured yet, so the method returns early.
      stateService.getEnvironmentUrls.mockResolvedValue(null);

      await sut.setUrlsFromStorage();

      expect(sut.getIdentityUrl()).toBe(CLOUD_IDENTITY);
      expect(sut.getApiUrl()).toBe(CLOUD_API);
    });

    it("picks up urls written after an earlier load found none", async () => {
      // Regression guard: on a fresh install the main process loads URLs at startup and finds
      // nothing, then the user configures a self-hosted server from the settings modal. Reloading
      // must observe the new value, otherwise login keeps posting credentials to the cloud
      // identity endpoint and fails with "invalid_client" until the app restarts.
      stateService.getEnvironmentUrls.mockResolvedValue(null);
      await sut.setUrlsFromStorage();
      expect(sut.getIdentityUrl()).toBe(CLOUD_IDENTITY);

      stateService.getEnvironmentUrls.mockResolvedValue({
        base: SELF_HOSTED,
        api: null,
        identity: null,
        webVault: null,
      } as EnvironmentUrls);

      await sut.setUrlsFromStorage();

      expect(sut.getIdentityUrl()).toBe(`${SELF_HOSTED}/identity`);
    });

    it("observes a server change made after the first load", async () => {
      stateService.getEnvironmentUrls.mockResolvedValue({
        base: SELF_HOSTED,
        api: null,
        identity: null,
        webVault: null,
      } as EnvironmentUrls);
      await sut.setUrlsFromStorage();

      stateService.getEnvironmentUrls.mockResolvedValue({
        base: "https://other.example.com",
        api: null,
        identity: null,
        webVault: null,
      } as EnvironmentUrls);

      await sut.setUrlsFromStorage();

      expect(sut.getIdentityUrl()).toBe("https://other.example.com/identity");
    });
  });

  describe("setUrls", () => {
    it("normalizes and persists the urls, then serves them", async () => {
      await sut.setUrls({
        base: "vault.example.com/",
        api: "",
        identity: "",
        webVault: "",
      } as EnvironmentUrls);

      expect(stateService.setEnvironmentUrls).toHaveBeenCalledWith(
        expect.objectContaining({ base: SELF_HOSTED }),
      );
      expect(sut.getIdentityUrl()).toBe(`${SELF_HOSTED}/identity`);
    });
  });
});
