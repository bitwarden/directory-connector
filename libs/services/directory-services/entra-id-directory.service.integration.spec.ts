/**
 * @jest-environment node
 */
import { config as dotenvConfig } from "dotenv";
import { mock, MockProxy } from "jest-mock-extended";

import { ApiService } from "@/libs/abstractions/api.service";
import { DirectoryFactoryService } from "@/libs/abstractions/directory-factory.service";
import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";
import { StateService } from "@/libs/abstractions/state.service";
import { GroupEntry } from "@/libs/models/groupEntry";
import { UserEntry } from "@/libs/models/userEntry";
import { BatchRequestBuilder } from "@/libs/services/batch-request-builder";
import { NodeCryptoFunctionService } from "@/libs/services/nodeCryptoFunction.service";
import { SingleRequestBuilder } from "@/libs/services/single-request-builder";
import { SyncService } from "@/libs/services/sync.service";

import {
  getEntraIdConfiguration,
  getSyncConfiguration,
} from "../../../utils/entra/config-fixtures";
import { allGroupFixtures, filteredGroupFixtures } from "../../../utils/entra/group-fixtures";
import { allUserFixtures, groupAUserFixtures } from "../../../utils/entra/user-fixtures";
import { DirectoryType } from "../../enums/directoryType";

import { EntraIdDirectoryService } from "./entra-id-directory.service";

// These tests integrate with a test Microsoft Entra ID tenant.
// Credentials are located in the shared Bitwarden collection for Directory Connector testing.
// Place the .env file attachment in the utils folder.

// Load .env variables
dotenvConfig({ path: "utils/.env" });

// This filter targets integration test data.
// It should return data that matches the fixtures exactly.
const INTEGRATION_GROUP_FILTER = "include: Integration Testing Group A";

// Object IDs of the seeded integration testing groups, see utils/entra fixtures.
// Group A has three members; Group B has none.
const INTEGRATION_GROUP_A_ID = "573783bf-d086-4e1e-9084-4b7b0d2a5969";
const INTEGRATION_GROUP_B_ID = "66578c29-73af-448b-b352-301f9588772b";

// These tests are slow!
// Increase the default timeout from 5s to 30s
jest.setTimeout(30000);

describe("entraIdDirectoryService", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;

  let directoryService: EntraIdDirectoryService;

  beforeEach(() => {
    logService = mock();
    i18nService = mock();
    stateService = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.EntraID);
    stateService.getDirectory
      .calledWith(DirectoryType.EntraID)
      .mockResolvedValue(getEntraIdConfiguration());
    stateService.getUserDelta.mockResolvedValue(null); // do not use delta link, fetch from scratch
    i18nService.t.mockImplementation((id) => id); // passthrough for error messages

    directoryService = new EntraIdDirectoryService(logService, i18nService, stateService);
  });

  it("syncs without filters (includes integration test data)", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));

    const [groups, users] = await directoryService.getEntries(true, true);

    expect(groups).toEqual(expect.arrayContaining(allGroupFixtures));
    expect(users).toEqual(expect.arrayContaining(allUserFixtures));
  });

  it("syncs users only (no groups)", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: false }));

    const [groups, users] = await directoryService.getEntries(true, true);

    expect(groups).toBeUndefined();
    expect(users).toEqual(expect.arrayContaining(allUserFixtures));
  });

  it("syncs groups only (no users)", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: false, groups: true }));

    const [groups, users] = await directoryService.getEntries(true, true);

    expect(groups).toEqual(expect.arrayContaining(allGroupFixtures));
    expect(users).toBeUndefined();
  });

  it("syncs using group filter (exact match for integration test data)", async () => {
    stateService.getSync.mockResolvedValue(
      getSyncConfiguration({ users: true, groups: true, groupFilter: INTEGRATION_GROUP_FILTER }),
    );

    const result = await directoryService.getEntries(true, true);

    expect(result).toEqual([filteredGroupFixtures, groupAUserFixtures]);
  });

  it("syncs users combining includeGroup with a secondary excludeGroup clause", async () => {
    stateService.getSync.mockResolvedValue(
      getSyncConfiguration({
        users: true,
        userFilter: `includeGroup:${INTEGRATION_GROUP_A_ID}|excludeGroup:${INTEGRATION_GROUP_B_ID}`,
      }),
    );

    const [, users] = await directoryService.getEntries(true, true);

    // Group B is empty in the test tenant, so the subtraction removes nobody
    // and all of Group A's members remain. This still exercises the secondary
    // excludeGroup lookup against the live Graph API.
    expect(users).toEqual(expect.arrayContaining(groupAUserFixtures));
  });

  it("syncs users combining includeGroup with a secondary exclude email clause", async () => {
    stateService.getSync.mockResolvedValue(
      getSyncConfiguration({
        users: true,
        userFilter: `includeGroup:${INTEGRATION_GROUP_A_ID}|exclude:amarshall@bwrox.dev`,
      }),
    );

    const [, users] = await directoryService.getEntries(true, true);

    const emails = users.map((u) => u.email);
    expect(emails).toContain("anders@bwrox.dev");
    expect(emails).toContain("jcooks@bwrox.dev");
    expect(emails).not.toContain("amarshall@bwrox.dev");
  });

  it("throws when credentials are invalid", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.EntraID)
      .mockResolvedValue(getEntraIdConfiguration({ key: "bad-secret" }));
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));

    await expect(directoryService.getEntries(true, true)).rejects.toThrow();
  });

  describe("unchanged directory is not re-uploaded when the result order varies", () => {
    let apiService: MockProxy<ApiService>;
    let messagingService: MockProxy<MessagingService>;
    let directoryFactory: MockProxy<DirectoryFactoryService>;
    let syncService: SyncService;

    let liveGroups: GroupEntry[];
    let liveUsers: UserEntry[];

    beforeAll(async () => {
      const bootstrapState = mock<StateService>();
      const bootstrapI18n = mock<I18nService>();

      bootstrapState.getDirectoryType.mockResolvedValue(DirectoryType.EntraID);
      bootstrapState.getDirectory
        .calledWith(DirectoryType.EntraID)
        .mockResolvedValue(getEntraIdConfiguration());
      bootstrapState.getUserDelta.mockResolvedValue(null); // fetch from scratch, no delta link
      bootstrapState.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));
      bootstrapI18n.t.mockImplementation((id) => id);

      [liveGroups, liveUsers] = await new EntraIdDirectoryService(
        mock<LogService>(),
        bootstrapI18n,
        bootstrapState,
      ).getEntries(true, true);

      expect(liveGroups.length).toBeGreaterThan(0);
      expect(liveUsers.length).toBeGreaterThan(0);
    });

    beforeEach(() => {
      apiService = mock();
      messagingService = mock();
      directoryFactory = mock();

      stateService.getApiUrl.mockResolvedValue("https://api.bitwarden.com");
      stateService.getOrganizationId.mockResolvedValue("fakeId");
      stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));

      syncService = new SyncService(
        // Real SHA-256, so the hash comparison under test is the production one.
        new NodeCryptoFunctionService(),
        apiService,
        messagingService,
        i18nService,
        stateService,
        new BatchRequestBuilder(),
        new SingleRequestBuilder(),
        directoryFactory,
      );
    });

    /** A fresh deep copy per run, so no run observes sorting applied by a previous one. */
    const copyLiveEntries = (ordering: "asIs" | "reversed"): [GroupEntry[], UserEntry[]] => {
      const groups = liveGroups.map((g) => GroupEntry.fromJSON(JSON.parse(JSON.stringify(g))));
      const users = liveUsers.map((u) => UserEntry.fromJSON(JSON.parse(JSON.stringify(u))));

      if (ordering === "reversed") {
        groups.reverse();
        users.reverse();
        // Member ordering varies independently of entry ordering.
        groups.forEach((g) => {
          g.userMemberExternalIds = new Set([...g.userMemberExternalIds].reverse());
        });
      }

      return [groups, users];
    };

    /** Stands in for a directory server returning the same entries in a different order per call. */
    const arrangeDirectoryReturning = (orderings: Array<"asIs" | "reversed">) => {
      const orderedService = mock<EntraIdDirectoryService>();
      orderings.forEach((ordering) =>
        orderedService.getEntries.mockResolvedValueOnce(copyLiveEntries(ordering)),
      );
      directoryFactory.createService.mockReturnValue(orderedService);
    };

    /** Mirrors production state: the hash written by one sync is read by the next. */
    const arrangeHashPersistence = () => {
      let lastSyncHash: string = null;
      stateService.getLastSyncHash.mockImplementation(async () => lastSyncHash);
      stateService.setLastSyncHash.mockImplementation(async (hash) => {
        lastSyncHash = hash;
      });
    };

    it("does not re-upload an unchanged directory when the result order changes", async () => {
      arrangeDirectoryReturning(["asIs", "reversed"]);
      arrangeHashPersistence();

      // First run: nothing synced yet, so the directory uploads and the hash is stored.
      await syncService.sync(false, false);
      expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(1);

      // Second run: identical directory, different order. Must be recognised as unchanged.
      const [groups, users] = await syncService.sync(false, false);

      expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(1);
      // SyncService signals a skipped import by returning nulls.
      expect(groups).toBeNull();
      expect(users).toBeNull();
    });

    it("produces an identical import payload regardless of result order", async () => {
      arrangeDirectoryReturning(["asIs", "reversed"]);
      // No hash persistence, so both runs upload and their payloads can be compared.
      stateService.getLastSyncHash.mockResolvedValue(null);

      await syncService.sync(false, false);
      await syncService.sync(false, false);

      expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(2);

      const [firstPayload] = apiService.postPublicImportDirectory.mock.calls[0];
      const [secondPayload] = apiService.postPublicImportDirectory.mock.calls[1];
      expect(JSON.stringify(firstPayload)).toEqual(JSON.stringify(secondPayload));
    });

    it("still uploads when the directory actually changes", async () => {
      arrangeDirectoryReturning(["asIs"]);
      arrangeHashPersistence();

      await syncService.sync(false, false);
      expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(1);

      // A real change on top of the reordered-but-otherwise-identical directory.
      const [groups, users] = copyLiveEntries("reversed");
      const addedUser = new UserEntry();
      addedUser.email = "pm44655-new-user@bwrox.dev";
      addedUser.externalId = "pm44655-new-user";
      addedUser.referenceId = "pm44655-new-user";
      users.push(addedUser);

      const changedService = mock<EntraIdDirectoryService>();
      changedService.getEntries.mockResolvedValue([groups, users]);
      directoryFactory.createService.mockReturnValue(changedService);

      await syncService.sync(false, false);

      expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(2);
    });
  });
});
