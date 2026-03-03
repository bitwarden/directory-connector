import { RequestBuilderOptions } from "@/libs/abstractions/request-builder.service";
import { UserEntry } from "@/libs/models/userEntry";

import { GetUniqueString } from "@/jslib/common/spec/utils";

import { SingleRequestBuilder } from "./single-request-builder";

import { groupSimulator, userSimulator } from "@/utils/request-builder-helper";

describe("SingleRequestBuilder", () => {
  let singleRequestBuilder: SingleRequestBuilder;

  beforeEach(async () => {
    singleRequestBuilder = new SingleRequestBuilder();
  });

  const defaultOptions: RequestBuilderOptions = Object.freeze({
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

    const options = { ...defaultOptions, overwriteExisting: true };
    const request = singleRequestBuilder.buildRequest(mockGroups, mockUsers, options)[0];

    expect(request.overwriteExisting).toBe(true);
  });

  it("SingleRequestBuilder returns request with deleted user when removeDisabled is true", () => {
    const mockGroups = groupSimulator(200);
    const mockUsers = userSimulator(200);

    const disabledUser = new UserEntry();
    const disabledUserEmail = GetUniqueString() + "@example.com";
    disabledUser.disabled = true;
    disabledUser.email = disabledUserEmail;
    mockUsers.push(disabledUser);

    const options = { ...defaultOptions, removeDisabled: true };
    const request = singleRequestBuilder.buildRequest(mockGroups, mockUsers, options)[0];

    expect(request.members.length).toEqual(201);
    expect(request.members.pop()).toEqual(
      expect.objectContaining({ email: disabledUserEmail, deleted: true }),
    );
    expect(request.overwriteExisting).toBe(false);
  });

  it("SingleRequestBuilder returns request with deleted user and overwriteExisting enabled when overwriteExisting and removeDisabled are true", () => {
    const mockGroups = groupSimulator(200);
    const mockUsers = userSimulator(200);

    const disabledUser = new UserEntry();
    const disabledUserEmail = GetUniqueString() + "@example.com";
    disabledUser.disabled = true;
    disabledUser.email = disabledUserEmail;
    mockUsers.push(disabledUser);

    const options = { overwriteExisting: true, removeDisabled: true };
    const request = singleRequestBuilder.buildRequest(mockGroups, mockUsers, options)[0];

    expect(request.members.pop()).toEqual(
      expect.objectContaining({ email: disabledUserEmail, deleted: true }),
    );
    expect(request.overwriteExisting).toBe(true);
  });
});
