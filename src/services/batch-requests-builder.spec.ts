import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { BatchRequestBuilder } from "./batch-request-builder";
import { SingleRequestBuilder } from "./single-request-builder";

describe("BatchRequestBuilder", () => {
  let batchRequestBuilder: BatchRequestBuilder;
  let singleRequestBuilder: SingleRequestBuilder;

  function userSimulator(userCount: number) {
    return Array(userCount).fill(new UserEntry());
  }

  function groupSimulator(groupCount: number) {
    return Array(groupCount).fill(new GroupEntry());
  }

  beforeEach(async () => {
    batchRequestBuilder = new BatchRequestBuilder();
    singleRequestBuilder = new SingleRequestBuilder();
  });

  it("BatchRequestBuilder batches requests for > 2000 users", () => {
    const mockGroups = groupSimulator(11000);
    const mockUsers = userSimulator(11000);

    const requests = batchRequestBuilder.buildRequest(mockGroups, mockUsers, true, true);

    expect(requests.length).toEqual(12);
  });

  it("SingleRequestBuilder returns single request for 200 users", () => {
    const mockGroups = groupSimulator(200);
    const mockUsers = userSimulator(200);

    const requests = singleRequestBuilder.buildRequest(mockGroups, mockUsers, true, true);

    expect(requests.length).toEqual(1);
  });

  it("BatchRequestBuilder retuns an empty array when there are no users or groups", () => {
    const requests = batchRequestBuilder.buildRequest([], [], true, true);

    expect(requests).toEqual([]);
  });
});
