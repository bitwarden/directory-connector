import { RequestBuilderOptions } from "@/libs/abstractions/request-builder.service";
import { UserEntry } from "@/libs/models/userEntry";

import { GetUniqueString } from "@/jslib/common/spec/utils";

import { BatchRequestBuilder } from "./batch-request-builder";

import { groupSimulator, userSimulator } from "@/utils/request-builder-helper";

describe("BatchRequestBuilder", () => {
  let batchRequestBuilder: BatchRequestBuilder;

  beforeEach(async () => {
    batchRequestBuilder = new BatchRequestBuilder();
  });

  const defaultOptions: RequestBuilderOptions = Object.freeze({
    overwriteExisting: false,
    removeDisabled: false,
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

    expect(requests[0].members).toContainEqual({ email: disabledUserEmail1, deleted: true });
    expect(requests[1].members.find((m) => m.deleted)).toBeUndefined();
    expect(requests[3].members.find((m) => m.deleted)).toBeUndefined();
    expect(requests[4].members.find((m) => m.deleted)).toBeUndefined();
    expect(requests[5].members).toContainEqual({ email: disabledUserEmail2, deleted: true });
  });

  it("BatchRequestBuilder retuns an empty array when there are no users or groups", () => {
    const requests = batchRequestBuilder.buildRequest([], [], defaultOptions);

    expect(requests).toEqual([]);
  });
});
