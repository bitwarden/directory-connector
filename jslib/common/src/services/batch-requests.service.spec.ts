import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { BatchRequestBuilder } from "./batch-requests.service";
import { SingleRequestBuilder } from "./single-request.service";

describe("BatchingService", () => {
  let batchRequestBuilder: BatchRequestBuilder;
  let singleRequestBuilder: SingleRequestBuilder;

  function userSimulator(userCount: number) {
    const simulatedArray: UserEntry[] = [];
    for (let i = 0; i <= userCount; i++) {
      simulatedArray.push(new UserEntry());
    }
    return simulatedArray;
  }

  function groupSimulator(groupCount: number) {
    const simulatedArray: GroupEntry[] = [];
    for (let i = 0; i <= groupCount; i++) {
      simulatedArray.push(new GroupEntry());
    }
    return simulatedArray;
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
