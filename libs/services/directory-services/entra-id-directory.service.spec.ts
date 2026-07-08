import { mock, MockProxy } from "jest-mock-extended";

// The Graph client's real constructor validates that a fetch polyfill is
// available, which isn't the case under jsdom. Stub it out - every test
// installs its own client mock via installGraphMock below.
jest.mock("@microsoft/microsoft-graph-client", () => ({
  Client: {
    init: jest.fn(() => ({})),
  },
}));

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
