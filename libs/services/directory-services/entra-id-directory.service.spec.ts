// The Graph client's real constructor validates that a fetch polyfill is
// available, which isn't the case under jsdom. Stub it out - every test
// installs its own client mock via installGraphMock below.
jest.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: jest.fn(() => ({})),
  },
}));

const mockHttpsRequest = jest.fn();
jest.mock("node:https", () => ({
  request: (...args: unknown[]) => mockHttpsRequest(...args),
}));

// https-proxy-agent and undici ship ES modules that Jest can't load; stand-in
// classes are enough to observe which one the service hands to the transports.
jest.mock("https-proxy-agent", () => ({
  HttpsProxyAgent: class HttpsProxyAgent {
    constructor(public proxy: string) {}
  },
}));
jest.mock("undici", () => ({
  EnvHttpProxyAgent: class EnvHttpProxyAgent {},
}));

import { Client } from "@microsoft/microsoft-graph-client";
import { HttpsProxyAgent } from "https-proxy-agent";
import { mock, MockProxy } from "jest-mock-extended";
import { EnvHttpProxyAgent } from "undici";

import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { StateService } from "@/libs/abstractions/state.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { EntraIdConfiguration } from "@/libs/models/entraIdConfiguration";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

import { EntraIdDirectoryService } from "./entra-id-directory.service";

// Mirrors the constant used inside the service. If either the constant or
// the Graph URL template shifts, these tests will fail loudly rather than
// silently miss the mocked response.
const UserSelectParams = "?$select=id,mail,userPrincipalName,displayName,accountEnabled";

function makeUser(id: string, mail: string) {
  return {
    id,
    mail,
    userPrincipalName: mail,
    displayName: mail,
    accountEnabled: true,
  };
}

function makeSyncConfig(userFilter: string): SyncConfiguration {
  return {
    users: true,
    groups: false,
    interval: 5,
    userFilter,
    groupFilter: "",
    removeDisabled: false,
    overwriteExisting: false,
    largeImport: false,
    groupObjectClass: "",
    userObjectClass: "",
    groupPath: null,
    userPath: null,
    groupNameAttribute: "",
    userEmailAttribute: "",
    memberAttribute: "",
    useEmailPrefixSuffix: false,
    emailPrefixAttribute: "",
    emailSuffix: null,
    creationDateAttribute: "",
    revisionDateAttribute: "",
  } as SyncConfiguration;
}

function makeEntraIdConfig(): EntraIdConfiguration {
  return {
    identityAuthority: "login.microsoftonline.com",
    tenant: "tenant-id",
    applicationId: "app-id",
    key: "key",
  };
}

describe("EntraIdDirectoryService — include/exclude combining", () => {
  const USER_1 = makeUser("id-1", "user1@x.com");
  const USER_2 = makeUser("id-2", "user2@x.com");
  const USER_3 = makeUser("id-3", "user3@x.com");

  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;
  let directoryService: EntraIdDirectoryService;

  // Swap the private Graph client for a stub that dispatches by request path.
  // Unknown paths return an empty value list so the surrounding loops
  // (delta users, group iteration) terminate cleanly.
  //
  // Note: group IDs in filter strings ("includeGroup:A") are lowercased by
  // the parser before being embedded in the request URL, so mock keys use
  // lowercase (e.g. "/groups/a/transitiveMembers...").
  function installGraphMock(pathResponses: Record<string, { value: unknown[] }>) {
    (directoryService as unknown as { client: unknown }).client = {
      api: (path: string) => ({
        get: () => Promise.resolve(pathResponses[path] ?? { value: [] }),
      }),
    };
  }

  beforeEach(() => {
    logService = mock();
    i18nService = mock();
    stateService = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.EntraID);
    stateService.getDirectory
      .calledWith(DirectoryType.EntraID)
      .mockResolvedValue(makeEntraIdConfig());
    stateService.getUserDelta.mockResolvedValue(null);
    i18nService.t.mockImplementation((id) => id);

    directoryService = new EntraIdDirectoryService(logService, i18nService, stateService);
  });

  describe("baseline (single-clause) behavior is preserved", () => {
    it("returns every member of the included group when no secondary clause is present", async () => {
      stateService.getSync.mockResolvedValue(makeSyncConfig("includeGroup:A"));
      installGraphMock({
        [`/groups/a/transitiveMembers${UserSelectParams}`]: {
          value: [USER_1, USER_2, USER_3],
        },
        [`/users/delta${UserSelectParams}`]: { value: [] },
      });

      const [, users] = await directoryService.getEntries(true, true);

      expect(users.map((u) => u.email).sort()).toEqual([
        "user1@x.com",
        "user2@x.com",
        "user3@x.com",
      ]);
    });
  });

  describe("includeGroup combined with excludeGroup", () => {
    it("subtracts members of the secondary excludeGroup from the included set", async () => {
      stateService.getSync.mockResolvedValue(makeSyncConfig("includeGroup:A|excludeGroup:B"));
      installGraphMock({
        [`/groups/a/transitiveMembers${UserSelectParams}`]: {
          value: [USER_1, USER_2, USER_3],
        },
        [`/groups/b/transitiveMembers${UserSelectParams}`]: {
          value: [USER_2, USER_3],
        },
        [`/users/delta${UserSelectParams}`]: { value: [] },
      });

      const [, users] = await directoryService.getEntries(true, true);

      expect(users.map((u) => u.email)).toEqual(["user1@x.com"]);
    });

    it("merges multiple excludeGroup clauses into a single exclusion set", async () => {
      stateService.getSync.mockResolvedValue(
        makeSyncConfig("includeGroup:A|excludeGroup:B|excludeGroup:C"),
      );
      installGraphMock({
        [`/groups/a/transitiveMembers${UserSelectParams}`]: {
          value: [USER_1, USER_2, USER_3],
        },
        [`/groups/b/transitiveMembers${UserSelectParams}`]: { value: [USER_2] },
        [`/groups/c/transitiveMembers${UserSelectParams}`]: { value: [USER_3] },
        [`/users/delta${UserSelectParams}`]: { value: [] },
      });

      const [, users] = await directoryService.getEntries(true, true);

      expect(users.map((u) => u.email)).toEqual(["user1@x.com"]);
    });
  });

  describe("includeGroup combined with exclude (by email)", () => {
    it("drops individual users whose email matches a secondary exclude clause", async () => {
      stateService.getSync.mockResolvedValue(makeSyncConfig("includeGroup:A|exclude:user2@x.com"));
      installGraphMock({
        [`/groups/a/transitiveMembers${UserSelectParams}`]: {
          value: [USER_1, USER_2, USER_3],
        },
        [`/users/delta${UserSelectParams}`]: { value: [] },
      });

      const [, users] = await directoryService.getEntries(true, true);

      expect(users.map((u) => u.email).sort()).toEqual(["user1@x.com", "user3@x.com"]);
    });

    it("supports a comma-separated list of emails inside a single exclude clause", async () => {
      stateService.getSync.mockResolvedValue(
        makeSyncConfig("includeGroup:A|exclude:user1@x.com,user3@x.com"),
      );
      installGraphMock({
        [`/groups/a/transitiveMembers${UserSelectParams}`]: {
          value: [USER_1, USER_2, USER_3],
        },
        [`/users/delta${UserSelectParams}`]: { value: [] },
      });

      const [, users] = await directoryService.getEntries(true, true);

      expect(users.map((u) => u.email)).toEqual(["user2@x.com"]);
    });

    it("matches exclude emails case-insensitively", async () => {
      stateService.getSync.mockResolvedValue(makeSyncConfig("includeGroup:A|exclude:USER2@X.COM"));
      installGraphMock({
        [`/groups/a/transitiveMembers${UserSelectParams}`]: {
          value: [USER_1, USER_2, USER_3],
        },
        [`/users/delta${UserSelectParams}`]: { value: [] },
      });

      const [, users] = await directoryService.getEntries(true, true);

      expect(users.map((u) => u.email).sort()).toEqual(["user1@x.com", "user3@x.com"]);
    });
  });

  describe("includeGroup combined with excludeGroup and exclude together", () => {
    it("applies both secondary clause kinds within a single filter", async () => {
      stateService.getSync.mockResolvedValue(
        makeSyncConfig("includeGroup:A|excludeGroup:B|exclude:user3@x.com"),
      );
      installGraphMock({
        [`/groups/a/transitiveMembers${UserSelectParams}`]: {
          value: [USER_1, USER_2, USER_3],
        },
        [`/groups/b/transitiveMembers${UserSelectParams}`]: { value: [USER_2] },
        [`/users/delta${UserSelectParams}`]: { value: [] },
      });

      const [, users] = await directoryService.getEntries(true, true);

      expect(users.map((u) => u.email)).toEqual(["user1@x.com"]);
    });
  });
});

describe("EntraIdDirectoryService — proxy support", () => {
  const PROXY_VARS = ["https_proxy", "HTTPS_PROXY", "http_proxy", "HTTP_PROXY"];
  const savedEnv: Record<string, string | undefined> = {};

  function createService() {
    const stateService = mock<StateService>();
    const i18nService = mock<I18nService>();
    i18nService.t.mockImplementation((id) => id);
    const service = new EntraIdDirectoryService(mock<LogService>(), i18nService, stateService);
    (service as unknown as { dirConfig: EntraIdConfiguration }).dirConfig = makeEntraIdConfig();
    return service;
  }

  function lastInitOptions() {
    const calls = (Client.init as jest.Mock).mock.calls;
    return calls[calls.length - 1][0] as {
      authProvider: (done: (err: Error | null, token: string | null) => void) => void;
      fetchOptions?: { dispatcher?: unknown };
    };
  }

  function requestAccessToken() {
    mockHttpsRequest.mockImplementation(() => {
      const req = { on: jest.fn(), write: jest.fn(), end: jest.fn() };
      req.on.mockReturnValue(req);
      return req;
    });
    lastInitOptions().authProvider(jest.fn());
    return mockHttpsRequest.mock.calls[0][0] as { agent?: unknown };
  }

  beforeEach(() => {
    PROXY_VARS.forEach((v) => {
      savedEnv[v] = process.env[v];
      delete process.env[v];
    });
    (Client.init as jest.Mock).mockClear();
    mockHttpsRequest.mockReset();
  });

  afterEach(() => {
    PROXY_VARS.forEach((v) => {
      if (savedEnv[v] === undefined) {
        delete process.env[v];
      } else {
        process.env[v] = savedEnv[v];
      }
    });
  });

  it("sends the token request through the proxy when https_proxy is set", () => {
    process.env.https_proxy = "http://proxy.example:3128";
    createService();

    expect(requestAccessToken().agent).toBeInstanceOf(HttpsProxyAgent);
  });

  it("sends the token request directly when no proxy is configured", () => {
    createService();

    expect(requestAccessToken().agent).toBeUndefined();
  });

  it("gives the Graph client a proxy dispatcher when a proxy is configured", () => {
    process.env.HTTPS_PROXY = "http://proxy.example:3128";
    createService();

    expect(lastInitOptions().fetchOptions?.dispatcher).toBeInstanceOf(EnvHttpProxyAgent);
  });

  it("leaves the Graph client's fetch options alone when no proxy is configured", () => {
    createService();

    expect(lastInitOptions().fetchOptions).toBeUndefined();
  });
});
