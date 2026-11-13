/**
 * @jest-environment node
 */
import { mock, MockProxy } from "jest-mock-extended";

import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { StateService } from "@/libs/abstractions/state.service";
import { DirectoryType } from "@/libs/enums/directoryType";

import { getSyncConfiguration } from "../../../utils/onelogin/config-fixtures";

import { OneLoginDirectoryService } from "./onelogin-directory.service";

const UsersUrl = "https://api.us.onelogin.com/api/1/users";
const UsersPage2Url = "https://api.us.onelogin.com/api/1/users?after_cursor=page2";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function usersPage(users: { id: number; email: string }[], nextLink: string | null) {
  return {
    status: { error: false, code: 200, type: "success", message: "Success" },
    pagination: { next_link: nextLink },
    data: users.map((u) => ({ ...u, status: 1, role_id: [] as number[] })),
  };
}

describe("OneLoginDirectoryService", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;
  let fetchMock: jest.SpyInstance;

  let directoryService: OneLoginDirectoryService;

  beforeEach(() => {
    logService = mock();
    i18nService = mock();
    stateService = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.OneLogin);
    stateService.getDirectory.calledWith(DirectoryType.OneLogin).mockResolvedValue({
      clientId: "client-id",
      clientSecret: "client-secret",
      region: "us",
    });
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true }));
    i18nService.t.mockImplementation((id) => id);

    fetchMock = jest.spyOn(globalThis, "fetch");

    directoryService = new OneLoginDirectoryService(logService, i18nService, stateService);
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  function mockApi(responses: Record<string, Response>) {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.endsWith("/auth/oauth2/v2/token")) {
        return jsonResponse(200, { access_token: "token" });
      }
      const response = responses[url];
      if (response == null) {
        throw new Error(`Unexpected request: ${url}`);
      }
      return response;
    });
  }

  it("follows pagination links to return all users", async () => {
    mockApi({
      [UsersUrl]: jsonResponse(
        200,
        usersPage([{ id: 1, email: "user1@example.com" }], UsersPage2Url),
      ),
      [UsersPage2Url]: jsonResponse(200, usersPage([{ id: 2, email: "user2@example.com" }], null)),
    });

    const [, users] = await directoryService.getEntries(true, true);

    expect(users.map((u) => u.email)).toEqual(["user1@example.com", "user2@example.com"]);
  });

  it("throws instead of returning a partial user list when a later page fails", async () => {
    mockApi({
      [UsersUrl]: jsonResponse(
        200,
        usersPage([{ id: 1, email: "user1@example.com" }], UsersPage2Url),
      ),
      [UsersPage2Url]: jsonResponse(429, {
        status: { error: true, code: 429, type: "rate limit", message: "Too many requests" },
      }),
    });

    await expect(directoryService.getEntries(true, true)).rejects.toThrow("API call failed.");
  });

  it("throws instead of returning no users when the first page fails", async () => {
    mockApi({
      [UsersUrl]: jsonResponse(401, {
        status: { error: true, code: 401, type: "Unauthorized", message: "Authentication Failure" },
      }),
    });

    await expect(directoryService.getEntries(true, true)).rejects.toThrow("API call failed.");
  });
});
