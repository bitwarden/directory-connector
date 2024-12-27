import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { BatchingService } from "./batching.service";

describe("BatchingService", () => {
  let batchingService: BatchingService;
  let userSimulator: (userCount: number) => UserEntry[];
  let groupSimulator: (userCount: number) => GroupEntry[];

  beforeEach(async () => {
    batchingService = new BatchingService();

    userSimulator = (userCount: number) => {
      const simulatedArray: UserEntry[] = [];
      for (let i = 0; i < userCount; i += batchingService.batchSize) {
        for (let j = 0; j <= batchingService.batchSize; j++) {
          simulatedArray.push(new UserEntry());
        }
      }
      return simulatedArray;
    };

    groupSimulator = (groupCount: number) => {
      const simulatedArray: GroupEntry[] = [];
      for (let i = 0; i < groupCount; i += batchingService.batchSize) {
        for (let j = 0; j <= batchingService.batchSize; j++) {
          simulatedArray.push(new GroupEntry());
        }
      }
      return simulatedArray;
    };
  });

  it("Batches requests for > 2000 users", () => {
    const mockGroups = groupSimulator(11000);
    const mockUsers = userSimulator(11000);

    const requests = batchingService.batchRequests(mockGroups, mockUsers, true, true);

    expect(requests.length).toEqual(
      Math.ceil(mockGroups.length / batchingService.batchSize) +
        Math.ceil(mockUsers.length / batchingService.batchSize),
    );
  });

  it("Does not batch requests for < 2000 users", () => {
    const mockGroups = groupSimulator(200);
    const mockUsers = userSimulator(200);

    const requests = batchingService.batchRequests(mockGroups, mockUsers, true, true);

    expect(requests.length).toEqual(
      Math.ceil(mockGroups.length / batchingService.batchSize) +
        Math.ceil(mockUsers.length / batchingService.batchSize),
    );
  });

  it("Retuns an empty array when there are no users or groups", () => {
    const mockGroups = groupSimulator(0);
    const mockUsers = userSimulator(0);

    const requests = batchingService.batchRequests(mockGroups, mockUsers, true, true);

    expect(requests).toEqual([]);
  });
});
