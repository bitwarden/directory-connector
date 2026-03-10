import { mock, MockProxy } from "jest-mock-extended";

import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";
import { ApiService } from "@/jslib/common/src/services/api.service";

import { GroupEntry } from "@/src/models/groupEntry";

import { getSyncConfiguration } from "../../utils/openldap/config-fixtures";
import { DirectoryFactoryService } from "../abstractions/directory-factory.service";
import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";

import { BatchRequestBuilder } from "./batch-request-builder";
import { LdapDirectoryService } from "./directory-services/ldap-directory.service";
import { I18nService } from "./i18n.service";
import { SingleRequestBuilder } from "./single-request-builder";
import { SyncService } from "./sync.service";
import * as constants from "./sync.service";

import { groupFixtures } from "@/utils/openldap/group-fixtures";
import { userFixtures } from "@/utils/openldap/user-fixtures";

describe("SyncService", () => {
  let cryptoFunctionService: MockProxy<CryptoFunctionService>;
  let apiService: MockProxy<ApiService>;
  let messagingService: MockProxy<MessagingService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;
  let directoryFactory: MockProxy<DirectoryFactoryService>;
  let batchRequestBuilder: MockProxy<BatchRequestBuilder>;
  let singleRequestBuilder: MockProxy<SingleRequestBuilder>;

  let syncService: SyncService;

  const originalBatchSize = constants.batchSize;

  beforeEach(() => {
    cryptoFunctionService = mock();
    apiService = mock();
    messagingService = mock();
    i18nService = mock();
    stateService = mock();
    directoryFactory = mock();
    batchRequestBuilder = mock();
    singleRequestBuilder = mock();

    stateService.getApiUrl.mockResolvedValue("https://api.bitwarden.com");
    stateService.getDirectoryType.mockResolvedValue(DirectoryType.Ldap);
    stateService.getOrganizationId.mockResolvedValue("fakeId");
    const mockDirectoryService = mock<LdapDirectoryService>();
    mockDirectoryService.getEntries.mockResolvedValue([groupFixtures, userFixtures]);
    directoryFactory.createService.mockReturnValue(mockDirectoryService);

    syncService = new SyncService(
      cryptoFunctionService,
      apiService,
      messagingService,
      i18nService,
      stateService,
      batchRequestBuilder,
      singleRequestBuilder,
      directoryFactory,
    );
  });

  it("Sync posts single request successfully for unique hashes", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
    // This arranges the last hash to be differet from the ArrayBuffer after it is converted to b64
    stateService.getLastSyncHash.mockResolvedValue("unique hash");

    const mockRequest: OrganizationImportRequest[] = [
      {
        members: [],
        groups: [],
        overwriteExisting: true,
        largeImport: true,
      },
    ];

    singleRequestBuilder.buildRequest.mockReturnValue(mockRequest);

    await syncService.sync(true, false);

    expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(1);
  });

  it("Sync posts multiple request successfully for unique hashes", async () => {
    stateService.getSync.mockResolvedValue(
      getSyncConfiguration({ groups: true, users: true, largeImport: true }),
    );
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
    // This arranges the last hash to be differet from the ArrayBuffer after it is converted to b64
    stateService.getLastSyncHash.mockResolvedValue("unique hash");

    // @ts-expect-error This is a workaround to make the batchsize smaller to trigger the batching logic since its a const.
    // eslint-disable-next-line no-import-assign
    constants.batchSize = 4;

    const mockRequests = new Array(6).fill({
      members: [],
      groups: [],
      overwriteExisting: true,
      largeImport: true,
    });

    batchRequestBuilder.buildRequest.mockReturnValue(mockRequests);

    await syncService.sync(true, false);

    expect(apiService.postPublicImportDirectory).toHaveBeenCalledTimes(6);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[0]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[1]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[2]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[3]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[4]);
    expect(apiService.postPublicImportDirectory).toHaveBeenCalledWith(mockRequests[5]);

    // @ts-expect-error Reset batch size back to original value.
    // eslint-disable-next-line no-import-assign
    constants.batchSize = originalBatchSize;
  });

  it("does not post for the same hash", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
    cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
    // This arranges the last hash to be the same as the ArrayBuffer after it is converted to b64
    stateService.getLastSyncHash.mockResolvedValue("AA==");

    await syncService.sync(true, false);

    expect(apiService.postPublicImportDirectory).not.toHaveBeenCalled();
  });

  describe("nested and circular group handling", () => {
    function createGroup(
      name: string,
      userExternalIds: string[] = [],
      groupMemberReferenceIds: string[] = [],
    ) {
      return GroupEntry.fromJSON({
        name,
        referenceId: name,
        externalId: name,
        userMemberExternalIds: userExternalIds,
        groupMemberReferenceIds: groupMemberReferenceIds,
        users: [],
      });
    }

    function setupSyncWithGroups(groups: GroupEntry[]) {
      const mockDirectoryService = mock<LdapDirectoryService>();
      mockDirectoryService.getEntries.mockResolvedValue([groups, []]);
      directoryFactory.createService.mockReturnValue(mockDirectoryService);

      stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
      cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
      stateService.getLastSyncHash.mockResolvedValue("unique hash");
      singleRequestBuilder.buildRequest.mockReturnValue([
        { members: [], groups: [], overwriteExisting: true, largeImport: false },
      ]);
    }

    it("should handle simple circular reference (A ↔ B) without stack overflow", async () => {
      const groupA = createGroup("GroupA", ["userA"], ["GroupB"]);
      const groupB = createGroup("GroupB", ["userB"], ["GroupA"]);
      setupSyncWithGroups([groupA, groupB]);

      const [groups] = await syncService.sync(true, true);

      const [a, b] = groups;
      expect(a.userMemberExternalIds).toEqual(new Set(["userA", "userB"]));
      expect(b.userMemberExternalIds).toEqual(new Set(["userA", "userB"]));
    });

    it("should handle longer circular chain (A → B → C → A) without stack overflow", async () => {
      const groupA = createGroup("GroupA", ["userA"], ["GroupB"]);
      const groupB = createGroup("GroupB", ["userB"], ["GroupC"]);
      const groupC = createGroup("GroupC", ["userC"], ["GroupA"]);
      setupSyncWithGroups([groupA, groupB, groupC]);

      const [groups] = await syncService.sync(true, true);

      const allUsers = new Set(["userA", "userB", "userC"]);
      for (const group of groups) {
        expect(group.userMemberExternalIds).toEqual(allUsers);
      }
    });

    it("should handle diamond structure (A → [B, C] → D)", async () => {
      const groupA = createGroup("GroupA", ["userA"], ["GroupB", "GroupC"]);
      const groupB = createGroup("GroupB", ["userB"], ["GroupD"]);
      const groupC = createGroup("GroupC", ["userC"], ["GroupD"]);
      const groupD = createGroup("GroupD", ["userD"], []);
      setupSyncWithGroups([groupA, groupB, groupC, groupD]);

      const [groups] = await syncService.sync(true, true);

      const [a, b, c, d] = groups;
      expect(a.userMemberExternalIds).toEqual(new Set(["userA", "userB", "userC", "userD"]));
      expect(b.userMemberExternalIds).toEqual(new Set(["userB", "userD"]));
      expect(c.userMemberExternalIds).toEqual(new Set(["userC", "userD"]));
      expect(d.userMemberExternalIds).toEqual(new Set(["userD"]));
    });

    it("should handle deep nesting with circular reference at leaf", async () => {
      // Structure: A → B → C → D → B (cycle back to B)
      const groupA = createGroup("GroupA", ["userA"], ["GroupB"]);
      const groupB = createGroup("GroupB", ["userB"], ["GroupC"]);
      const groupC = createGroup("GroupC", ["userC"], ["GroupD"]);
      const groupD = createGroup("GroupD", ["userD"], ["GroupB"]);
      setupSyncWithGroups([groupA, groupB, groupC, groupD]);

      const [groups] = await syncService.sync(true, true);

      const [a, b, c, d] = groups;
      const cycleUsers = new Set(["userB", "userC", "userD"]);
      expect(a.userMemberExternalIds).toEqual(new Set(["userA", ...cycleUsers]));
      expect(b.userMemberExternalIds).toEqual(cycleUsers);
      expect(c.userMemberExternalIds).toEqual(cycleUsers);
      expect(d.userMemberExternalIds).toEqual(cycleUsers);
    });

    it("should handle complex structure with multiple cycles and shared members", async () => {
      // Structure:
      // A → [B, C]
      // B → [D, E]
      // C → [E, F]
      // D → A (cycle)
      // E → C (cycle)
      // F → (leaf)
      const groupA = createGroup("GroupA", ["userA"], ["GroupB", "GroupC"]);
      const groupB = createGroup("GroupB", ["userB"], ["GroupD", "GroupE"]);
      const groupC = createGroup("GroupC", ["userC"], ["GroupE", "GroupF"]);
      const groupD = createGroup("GroupD", ["userD"], ["GroupA"]);
      const groupE = createGroup("GroupE", ["userE"], ["GroupC"]);
      const groupF = createGroup("GroupF", ["userF"], []);
      setupSyncWithGroups([groupA, groupB, groupC, groupD, groupE, groupF]);

      const [groups] = await syncService.sync(true, true);

      const allUsers = new Set(["userA", "userB", "userC", "userD", "userE", "userF"]);
      const a = groups.find((g) => g.name === "GroupA");
      const b = groups.find((g) => g.name === "GroupB");
      const c = groups.find((g) => g.name === "GroupC");
      const d = groups.find((g) => g.name === "GroupD");
      const e = groups.find((g) => g.name === "GroupE");
      const f = groups.find((g) => g.name === "GroupF");

      // A can reach all groups, so it gets all users
      expect(a.userMemberExternalIds).toEqual(allUsers);
      // B reaches D, E, and through cycles reaches everything
      expect(b.userMemberExternalIds).toEqual(allUsers);
      // C reaches E (which cycles back to C) and F
      expect(c.userMemberExternalIds).toEqual(new Set(["userC", "userE", "userF"]));
      // D cycles to A, which reaches everything
      expect(d.userMemberExternalIds).toEqual(allUsers);
      // E cycles to C, picking up C's descendants
      expect(e.userMemberExternalIds).toEqual(new Set(["userC", "userE", "userF"]));
      // F is a leaf
      expect(f.userMemberExternalIds).toEqual(new Set(["userF"]));
    });
  });
});
