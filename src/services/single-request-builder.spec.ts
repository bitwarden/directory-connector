import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { RequestBuilderOptions } from "../abstractions/request-builder.service";

import { SingleRequestBuilder } from "./single-request-builder";

describe("SingleRequestBuilder", () => {
  let singleRequestBuilder: SingleRequestBuilder;

  function userSimulator(userCount: number) {
    return Array(userCount).fill(new UserEntry());
  }

  function groupSimulator(groupCount: number) {
    return Array(groupCount).fill(new GroupEntry());
  }

  beforeEach(async () => {
    singleRequestBuilder = new SingleRequestBuilder();
  });

  const defaultOptions = new RequestBuilderOptions({
    overwriteExisting: false,
    removeDisabled: false,
  });

  it("SingleRequestBuilder returns single request for 200 users", () => {
    const mockGroups = groupSimulator(200);
    const mockUsers = userSimulator(200);

    const requests = singleRequestBuilder.buildRequest(mockGroups, mockUsers, defaultOptions);

    expect(requests.length).toEqual(1);
  });

  it("SingleRequestBuilder returns request with overwriteExisting enabled", () => {
    const mockGroups = groupSimulator(200);
    const mockUsers = userSimulator(200);
    const options = new RequestBuilderOptions({ ...defaultOptions, overwriteExisting: true });

    const request = singleRequestBuilder.buildRequest(mockGroups, mockUsers, options)[0];
    expect(request.overwriteExisting).toBe(true);
  });

  it("SingleRequestBuilder returns request with deleted user when removeDisabled is true", () => {
    const mockGroups = groupSimulator(200);
    const mockUsers = userSimulator(200);
    const disabledUser = new UserEntry();
    const options = new RequestBuilderOptions({ ...defaultOptions, removeDisabled: true });

    disabledUser.disabled = true;
    mockUsers.push(disabledUser);

    const request = singleRequestBuilder.buildRequest(mockGroups, mockUsers, options)[0];
    expect(request.members.length).toEqual(201);
    expect(request.members.pop().deleted).toBe(true);
  });

  it("SingleRequestBuilder returns request with deleted user and overwriteExisting enabled when overwriteExisting and removeDisabled are true", () => {
    const mockGroups = groupSimulator(200);
    const mockUsers = userSimulator(200);
    const disabledUser = new UserEntry();
    const options = new RequestBuilderOptions({ overwriteExisting: true, removeDisabled: true });

    disabledUser.disabled = true;
    mockUsers.push(disabledUser);

    const request = singleRequestBuilder.buildRequest(mockGroups, mockUsers, options)[0];
    expect(request.members.pop().deleted).toBe(true);
    expect(request.overwriteExisting).toBe(true);
  });
});
