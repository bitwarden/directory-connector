import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { RequestBuilderOptions } from "../abstractions/request-builder.service";

import { BatchRequestBuilder } from "./batch-request-builder";

describe("BatchRequestBuilder", () => {
  let batchRequestBuilder: BatchRequestBuilder;

  function userSimulator(userCount: number) {
    return Array(userCount).fill(new UserEntry());
  }

  function groupSimulator(groupCount: number) {
    return Array(groupCount).fill(new GroupEntry());
  }

  beforeEach(async () => {
    batchRequestBuilder = new BatchRequestBuilder();
  });

  const defaultOptions = new RequestBuilderOptions({
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
    const options = new RequestBuilderOptions({ ...defaultOptions, overwriteExisting: true });

    const r = () => batchRequestBuilder.buildRequest(mockGroups, mockUsers, options);

    expect(r).toThrow(
      "You cannot use the 'Remove and re-add organization users during the next sync' option with large imports.",
    );
  });

  it("BatchRequestBuilder returns requests with deleted users when removeDisabled is true", () => {
    const mockGroups = groupSimulator(11000);
    const disabledUser = new UserEntry();
    const mockUsers = userSimulator(11000);
    const options = new RequestBuilderOptions({ ...defaultOptions, removeDisabled: true });

    disabledUser.disabled = true;
    mockUsers[0] = disabledUser;
    mockUsers.push(disabledUser);

    const requests = batchRequestBuilder.buildRequest(mockGroups, mockUsers, options);
    expect(requests[0].members.find((m) => m.deleted)).toBeTruthy();
    expect(requests[1].members.find((m) => m.deleted)).toBeUndefined();
    expect(requests[3].members.find((m) => m.deleted)).toBeUndefined();
    expect(requests[4].members.find((m) => m.deleted)).toBeUndefined();
    expect(requests[5].members.find((m) => m.deleted)).toBeTruthy();
  });

  it("BatchRequestBuilder retuns an empty array when there are no users or groups", () => {
    const requests = batchRequestBuilder.buildRequest([], [], defaultOptions);

    expect(requests).toEqual([]);
  });
});
