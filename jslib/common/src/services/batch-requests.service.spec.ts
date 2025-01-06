import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { BatchRequestBuilder } from "./batch-requests.service";
import { SingleRequestBuilder } from "./single-request.service";

describe("BatchingService", () => {
  let batchRequestBuilder: BatchRequestBuilder;
  let singleRequestBuilder: SingleRequestBuilder;
  let userSimulator: (userCount: number) => UserEntry[];
  let groupSimulator: (userCount: number) => GroupEntry[];

  beforeEach(async () => {
    const batchSize = 2000;

    batchRequestBuilder = new BatchRequestBuilder(batchSize);
    singleRequestBuilder = new SingleRequestBuilder();

    userSimulator = (userCount: number) => {
      const simulatedArray: UserEntry[] = [];
      for (let i = 0; i < userCount; i += batchSize) {
        for (let j = 0; j <= batchSize; j++) {
          simulatedArray.push(new UserEntry());
        }
      }
      return simulatedArray;
    };

    groupSimulator = (groupCount: number) => {
      const simulatedArray: GroupEntry[] = [];
      for (let i = 0; i < groupCount; i += batchSize) {
        for (let j = 0; j <= batchSize; j++) {
          simulatedArray.push(new GroupEntry());
        }
      }
      return simulatedArray;
    };
  });

  it("Batches requests for > 2000 users", () => {
    const mockGroups = groupSimulator(11000);
    const mockUsers = userSimulator(11000);

    const requests = batchRequestBuilder.buildRequest(mockGroups, mockUsers, true, true);

    expect(requests.length).toEqual(14);
  });

  it("SingleRequestBuilder returns single request for 200 users", () => {
    const mockGroups = groupSimulator(200);
    const mockUsers = userSimulator(200);

    const requests = singleRequestBuilder.buildRequest(mockGroups, mockUsers, true, true);

    expect(requests.length).toEqual(1);
  });

  it("BatchRequestBuilder retuns an empty array when there are no users or groups", () => {
    const mockGroups = groupSimulator(0);
    const mockUsers = userSimulator(0);

    const requests = batchRequestBuilder.buildRequest(mockGroups, mockUsers, true, true);

    expect(requests).toEqual([]);
  });
});
