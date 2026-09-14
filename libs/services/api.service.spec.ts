/**
 * @jest-environment node
 *
 * ApiService constructs `Request` objects, which jsdom does not provide. The repo already uses
 * this docblock for tests that need Node's fetch globals (see sync.service.integration.spec.ts).
 */
import { mock, MockProxy } from "jest-mock-extended";

import { AppIdService } from "@/libs/abstractions/appId.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { TokenService } from "@/libs/abstractions/token.service";
import { DeviceType } from "@/libs/enums/deviceType";
import { OrganizationImportRequest } from "@/libs/models/request/organizationImportRequest";
import { ApiService } from "@/libs/services/api.service";

/**
 * Captures the URL of every outbound request and returns a canned 200 so no network is touched.
 */
class TestApiService extends ApiService {
  readonly requestedUrls: string[] = [];

  protected nativeFetch(request: Request): Promise<Response> {
    this.requestedUrls.push(request.url);
    return Promise.resolve(new Response("{}", { status: 200 }));
  }
}

function importRequest(): OrganizationImportRequest {
  return new OrganizationImportRequest({
    groups: [],
    users: [],
    overwriteExisting: false,
    largeImport: false,
  });
}

describe("ApiService", () => {
  let tokenService: MockProxy<TokenService>;
  let platformUtilsService: MockProxy<PlatformUtilsService>;
  let stateService: MockProxy<StateService>;
  let appIdService: MockProxy<AppIdService>;
  let sut: TestApiService;

  beforeEach(() => {
    tokenService = mock<TokenService>();
    platformUtilsService = mock<PlatformUtilsService>();
    stateService = mock<StateService>();
    appIdService = mock<AppIdService>();

    tokenService.getToken.mockResolvedValue("access-token");
    tokenService.tokenNeedsRefresh.mockResolvedValue(false);
    platformUtilsService.getDevice.mockReturnValue(DeviceType.MacOsDesktop);
    platformUtilsService.getClientType.mockReturnValue("connector" as never);
    platformUtilsService.getApplicationVersion.mockResolvedValue("2026.9.0");
    stateService.getEnvironmentUrls.mockResolvedValue(null);

    sut = new TestApiService(
      tokenService,
      platformUtilsService,
      stateService,
      appIdService,
      jest.fn(),
      "Bitwarden_DC/test",
    );
  });

  /**
   * Regression coverage for PM-43359. ApiService must resolve the server URL from StateService on
   * every request instead of caching it. The main process previously held URLs loaded at startup,
   * so a self-hosted server configured after launch was ignored and org credentials were posted
   * to the Bitwarden cloud endpoint — surfacing as "400 invalid_client" until the app restarted.
   */
  describe("server url resolution", () => {
    it("uses the api url resolved at the time of each request", async () => {
      stateService.getApiUrl.mockResolvedValue("https://first.example.com/api");
      await sut.postPublicImportDirectory(importRequest());

      // The configured server changes while the process keeps running.
      stateService.getApiUrl.mockResolvedValue("https://second.example.com/api");
      await sut.postPublicImportDirectory(importRequest());

      expect(sut.requestedUrls).toEqual([
        "https://first.example.com/api/public/organization/import",
        "https://second.example.com/api/public/organization/import",
      ]);
    });

    it("reads the api url from state on every request rather than caching it", async () => {
      stateService.getApiUrl.mockResolvedValue("https://example.com/api");

      await sut.postPublicImportDirectory(importRequest());
      await sut.postPublicImportDirectory(importRequest());

      expect(stateService.getApiUrl).toHaveBeenCalledTimes(2);
    });

    it("uses the identity url resolved at the time of each token request", async () => {
      stateService.getIdentityUrl.mockResolvedValue("https://first.example.com/identity");
      tokenService.getRefreshToken.mockResolvedValue("refresh-token");
      tokenService.getDecodedToken.mockResolvedValue({ client_id: "organization.abc" });

      await sut["doRefreshToken"]();

      stateService.getIdentityUrl.mockResolvedValue("https://second.example.com/identity");
      await sut["doRefreshToken"]();

      expect(sut.requestedUrls).toEqual([
        "https://first.example.com/identity/connect/token",
        "https://second.example.com/identity/connect/token",
      ]);
    });
  });
});
