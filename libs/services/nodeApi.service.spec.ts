import { mock } from "jest-mock-extended";

import { AppIdService } from "@/libs/abstractions/appId.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { TokenService } from "@/libs/abstractions/token.service";
import { DeviceType } from "@/libs/enums/deviceType";

import { NodeApiService } from "./nodeApi.service";

const netFetch = jest.fn();
jest.mock("electron", () => ({
  net: { fetch: (...args: unknown[]) => netFetch(...args) },
}));

describe("NodeApiService.nativeFetch", () => {
  beforeEach(() => {
    netFetch.mockReset();
  });

  it("delegates to Electron's net.fetch", async () => {
    const platformUtilsService = mock<PlatformUtilsService>();
    platformUtilsService.getDevice.mockReturnValue(DeviceType.MacOsDesktop);

    const service = new NodeApiService(
      mock<TokenService>(),
      platformUtilsService,
      mock<StateService>(),
      mock<AppIdService>(),
      async () => {},
    );

    const expectedResponse = { status: 200 } as Response;
    netFetch.mockResolvedValue(expectedResponse);

    const request = { url: "https://example.com" } as Request;
    const response = await service.nativeFetch(request);

    expect(netFetch).toHaveBeenCalledWith(request);
    expect(response).toBe(expectedResponse);
  });
});
