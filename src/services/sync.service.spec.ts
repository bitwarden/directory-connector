import { mock, MockProxy } from "jest-mock-extended";

import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";
import { ApiService } from "@/jslib/common/src/services/api.service";

import { GroupEntry } from "@/src/models/groupEntry";

import { getSyncConfiguration } from "../../utils/openldap/config-fixtures";
import { DirectoryFactoryService } from "../abstractions/directory-factory.service";
import { DirectoryType } from "../enums/directoryType";

import { BatchRequestBuilder } from "./batch-request-builder";
import { LdapDirectoryService } from "./directory-services/ldap-directory.service";
import { I18nService } from "./i18n.service";
import { SingleRequestBuilder } from "./single-request-builder";
import { StateService } from "./state.service";
import { SyncService } from "./sync.service";
import * as constants from "./sync.service";

import { groupFixtures } from "@/utils/openldap/group-fixtures";
import { userFixtures } from "@/utils/openldap/user-fixtures";

describe("SyncService", () => {
  let cryptoFunctionService: MockProxy<CryptoFunctionService>;
  let apiService: MockProxy<ApiService>;
  let messagingService: MockProxy<MessagingService>;
  let i18nService: MockProxy<I18nService>;
  let environmentService: MockProxy<EnvironmentService>;
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
    environmentService = mock();
    stateService = mock();
    directoryFactory = mock();
    batchRequestBuilder = mock();
    singleRequestBuilder = mock();

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
      environmentService,
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

    it("should handle simple circular reference (A ↔ B) without stack overflow", async () => {
      const groupA = createGroup("GroupA", ["userA"], ["GroupB"]);
      const groupB = createGroup("GroupB", ["userB"], ["GroupA"]);
      const circularGroups = [groupA, groupB];

      const mockDirectoryService = mock<LdapDirectoryService>();
      mockDirectoryService.getEntries.mockResolvedValue([circularGroups, []]);
      directoryFactory.createService.mockReturnValue(mockDirectoryService);

      stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
      cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
      stateService.getLastSyncHash.mockResolvedValue("unique hash");
      singleRequestBuilder.buildRequest.mockReturnValue([
        { members: [], groups: [], overwriteExisting: true, largeImport: false },
      ]);

      const [groups] = await syncService.sync(true, true);

      // Both groups should have both users after flattening
      expect(groups[0].userMemberExternalIds).toContain("userA");
      expect(groups[0].userMemberExternalIds).toContain("userB");
      expect(groups[1].userMemberExternalIds).toContain("userA");
      expect(groups[1].userMemberExternalIds).toContain("userB");
    });

    it("should handle longer circular chain (A → B → C → A) without stack overflow", async () => {
      const groupA = createGroup("GroupA", ["userA"], ["GroupB"]);
      const groupB = createGroup("GroupB", ["userB"], ["GroupC"]);
      const groupC = createGroup("GroupC", ["userC"], ["GroupA"]);
      const circularGroups = [groupA, groupB, groupC];

      const mockDirectoryService = mock<LdapDirectoryService>();
      mockDirectoryService.getEntries.mockResolvedValue([circularGroups, []]);
      directoryFactory.createService.mockReturnValue(mockDirectoryService);

      stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
      cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
      stateService.getLastSyncHash.mockResolvedValue("unique hash");
      singleRequestBuilder.buildRequest.mockReturnValue([
        { members: [], groups: [], overwriteExisting: true, largeImport: false },
      ]);

      const [groups] = await syncService.sync(true, true);

      // All groups should have all users after flattening
      for (const group of groups) {
        expect(group.userMemberExternalIds).toContain("userA");
        expect(group.userMemberExternalIds).toContain("userB");
        expect(group.userMemberExternalIds).toContain("userC");
      }
    });

    it("should handle diamond structure (A → [B, C] → D)", async () => {
      const groupA = createGroup("GroupA", ["userA"], ["GroupB", "GroupC"]);
      const groupB = createGroup("GroupB", ["userB"], ["GroupD"]);
      const groupC = createGroup("GroupC", ["userC"], ["GroupD"]);
      const groupD = createGroup("GroupD", ["userD"], []);
      const diamondGroups = [groupA, groupB, groupC, groupD];

      const mockDirectoryService = mock<LdapDirectoryService>();
      mockDirectoryService.getEntries.mockResolvedValue([diamondGroups, []]);
      directoryFactory.createService.mockReturnValue(mockDirectoryService);

      stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
      cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
      stateService.getLastSyncHash.mockResolvedValue("unique hash");
      singleRequestBuilder.buildRequest.mockReturnValue([
        { members: [], groups: [], overwriteExisting: true, largeImport: false },
      ]);

      const [groups] = await syncService.sync(true, true);

      const [a, b, c, d] = groups;

      // A should have all users (through B and C, both containing D)
      expect(a.userMemberExternalIds).toContain("userA");
      expect(a.userMemberExternalIds).toContain("userB");
      expect(a.userMemberExternalIds).toContain("userC");
      expect(a.userMemberExternalIds).toContain("userD");

      // B should have its own user plus D's user
      expect(b.userMemberExternalIds).toContain("userB");
      expect(b.userMemberExternalIds).toContain("userD");

      // C should have its own user plus D's user
      expect(c.userMemberExternalIds).toContain("userC");
      expect(c.userMemberExternalIds).toContain("userD");

      // D should only have its own user
      expect(d.userMemberExternalIds).toContain("userD");
      expect(d.userMemberExternalIds.size).toBe(1);
    });

    it("should handle deep nesting with circular reference at leaf", async () => {
      // Structure: A → B → C → D → B (cycle back to B)
      const groupA = createGroup("GroupA", ["userA"], ["GroupB"]);
      const groupB = createGroup("GroupB", ["userB"], ["GroupC"]);
      const groupC = createGroup("GroupC", ["userC"], ["GroupD"]);
      const groupD = createGroup("GroupD", ["userD"], ["GroupB"]); // cycles back to B
      const deepGroups = [groupA, groupB, groupC, groupD];

      const mockDirectoryService = mock<LdapDirectoryService>();
      mockDirectoryService.getEntries.mockResolvedValue([deepGroups, []]);
      directoryFactory.createService.mockReturnValue(mockDirectoryService);

      stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
      cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
      stateService.getLastSyncHash.mockResolvedValue("unique hash");
      singleRequestBuilder.buildRequest.mockReturnValue([
        { members: [], groups: [], overwriteExisting: true, largeImport: false },
      ]);

      const [groups] = await syncService.sync(true, true);

      const [a, b, c, d] = groups;

      // A should have all users
      expect(a.userMemberExternalIds.size).toBe(4);

      // B, C, D form a cycle, so they should all have each other's users
      expect(b.userMemberExternalIds).toContain("userB");
      expect(b.userMemberExternalIds).toContain("userC");
      expect(b.userMemberExternalIds).toContain("userD");

      expect(c.userMemberExternalIds).toContain("userB");
      expect(c.userMemberExternalIds).toContain("userC");
      expect(c.userMemberExternalIds).toContain("userD");

      expect(d.userMemberExternalIds).toContain("userB");
      expect(d.userMemberExternalIds).toContain("userC");
      expect(d.userMemberExternalIds).toContain("userD");
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
      const groupD = createGroup("GroupD", ["userD"], ["GroupA"]); // cycle to A
      const groupE = createGroup("GroupE", ["userE"], ["GroupC"]); // cycle to C
      const groupF = createGroup("GroupF", ["userF"], []);
      const complexGroups = [groupA, groupB, groupC, groupD, groupE, groupF];

      const mockDirectoryService = mock<LdapDirectoryService>();
      mockDirectoryService.getEntries.mockResolvedValue([complexGroups, []]);
      directoryFactory.createService.mockReturnValue(mockDirectoryService);

      stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));
      cryptoFunctionService.hash.mockResolvedValue(new ArrayBuffer(1));
      stateService.getLastSyncHash.mockResolvedValue("unique hash");
      singleRequestBuilder.buildRequest.mockReturnValue([
        { members: [], groups: [], overwriteExisting: true, largeImport: false },
      ]);

      // Should complete without stack overflow
      const [groups] = await syncService.sync(true, true);

      expect(groups).toHaveLength(6);

      // Verify A gets users from its descendants
      const a = groups.find((g) => g.name === "GroupA");
      expect(a.userMemberExternalIds).toContain("userA");
      expect(a.userMemberExternalIds).toContain("userB");
      expect(a.userMemberExternalIds).toContain("userC");

      // F should only have its own user (it's a leaf)
      const f = groups.find((g) => g.name === "GroupF");
      expect(f.userMemberExternalIds).toContain("userF");
      expect(f.userMemberExternalIds.size).toBe(1);
    });
  });
});
