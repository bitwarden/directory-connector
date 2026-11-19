import { RequestBuilderOptions } from "@/libs/abstractions/request-builder.service";
import { GroupEntry } from "@/libs/models/groupEntry";
import { UserEntry } from "@/libs/models/userEntry";
import { GetUniqueString } from "@/libs/utils/test.utils";

import { BatchRequestBuilder } from "./batch-request-builder";
import { batchSize } from "./sync.service";

import { groupSimulator, userSimulator } from "@/utils/request-builder-helper";

describe("BatchRequestBuilder", () => {
  let batchRequestBuilder: BatchRequestBuilder;

  beforeEach(async () => {
    batchRequestBuilder = new BatchRequestBuilder();
  });

  const defaultOptions: RequestBuilderOptions = Object.freeze({
    overwriteExisting: false,
    removeDisabled: false,
    inviteUsersAfterProvisioning: false,
  });

  it("BatchRequestBuilder batches requests for > 2000 users", () => {
    const mockGroups = groupSimulator(11000);
    const mockUsers = userSimulator(11000);
    const requests = batchRequestBuilder.buildRequest(mockGroups, mockUsers, defaultOptions);

    expect(requests.length).toEqual(12);
  });

  it("BatchRequestBuilder throws error when overwriteExisting is true", () => {
    const mockGroups = groupSimulator(11000);
    const mockUsers = userSimulator(11000);
    const options = { ...defaultOptions, overwriteExisting: true };

    const r = () => batchRequestBuilder.buildRequest(mockGroups, mockUsers, options);

    expect(r).toThrow(
      "You cannot use the 'Remove and re-add organization users during the next sync' option with large imports.",
    );
  });

  it("BatchRequestBuilder returns requests with deleted users when removeDisabled is true", () => {
    const mockGroups = groupSimulator(11000);
    const mockUsers = userSimulator(11000);

    const disabledUser1 = new UserEntry();
    const disabledUserEmail1 = GetUniqueString() + "@email.com";

    const disabledUser2 = new UserEntry();
    const disabledUserEmail2 = GetUniqueString() + "@email.com";

    disabledUser1.disabled = true;
    disabledUser1.email = disabledUserEmail1;
    disabledUser2.disabled = true;
    disabledUser2.email = disabledUserEmail2;

    mockUsers[0] = disabledUser1;
    mockUsers.push(disabledUser2);

    const options = { ...defaultOptions, removeDisabled: true };
    const requests = batchRequestBuilder.buildRequest(mockGroups, mockUsers, options);

    const allMembers = requests.flatMap((r) => r.members);
    expect(
      allMembers
        .filter((m) => m.deleted)
        .map((m) => m.email)
        .sort(),
    ).toEqual([disabledUserEmail1, disabledUserEmail2].sort());
  });

  it("BatchRequestBuilder retuns an empty array when there are no users or groups", () => {
    const requests = batchRequestBuilder.buildRequest([], [], defaultOptions);

    expect(requests).toEqual([]);
  });

  it("BatchRequestBuilder forwards inviteUsersAfterProvisioning from options into every partitioned request", () => {
    const mockGroups = groupSimulator(2500);
    const mockUsers = userSimulator(2500);

    const options = { ...defaultOptions, inviteUsersAfterProvisioning: true };
    const requests = batchRequestBuilder.buildRequest(mockGroups, mockUsers, options);

    expect(requests.length).toBeGreaterThan(1);
    expect(requests.every((r) => r.inviteUsersAfterProvisioning === true)).toBe(true);
  });

  it("BatchRequestBuilder defaults inviteUsersAfterProvisioning to false when unset in options", () => {
    const mockUsers = userSimulator(2500);

    // Simulate an existing configuration created before this setting existed.
    const options = { overwriteExisting: false, removeDisabled: false } as RequestBuilderOptions;
    const requests = batchRequestBuilder.buildRequest([], mockUsers, options);

    expect(requests.every((r) => r.inviteUsersAfterProvisioning === false)).toBe(true);
  });

  it("BatchRequestBuilder produces identical batches when the directory is returned in a different order", () => {
    // Enough entries to span several batches so partitioning is actually exercised.
    const entryCount = batchSize * 2 + 50;

    const buildDirectory = (reversed: boolean) => {
      const groups = Array.from({ length: entryCount }, (_, i) => {
        const group = new GroupEntry();
        // Zero-padded so lexical order is stable and distinct from insertion order.
        group.name = `Group ${String(i).padStart(5, "0")}`;
        group.externalId = `g-${String(i).padStart(5, "0")}`;
        group.userMemberExternalIds = new Set([`u-00001`, `u-00000`]);
        return group;
      });

      const users = Array.from({ length: entryCount }, (_, i) => {
        const user = new UserEntry();
        user.email = `user${String(i).padStart(5, "0")}@example.com`;
        user.externalId = `u-${String(i).padStart(5, "0")}`;
        return user;
      });

      if (reversed) {
        groups.reverse();
        users.reverse();
        groups.forEach((g) => {
          g.userMemberExternalIds = new Set([...g.userMemberExternalIds].reverse());
        });
      }

      return { groups, users };
    };

    const inOrder = buildDirectory(false);
    const reversed = buildDirectory(true);

    const requests = batchRequestBuilder.buildRequest(
      inOrder.groups,
      inOrder.users,
      defaultOptions,
    );
    const reorderedRequests = batchRequestBuilder.buildRequest(
      reversed.groups,
      reversed.users,
      defaultOptions,
    );

    // Guard the premise: this is meaningless unless the input really was batched.
    expect(requests.length).toBeGreaterThan(1);
    expect(JSON.stringify(requests)).toEqual(JSON.stringify(reorderedRequests));
  });
});
