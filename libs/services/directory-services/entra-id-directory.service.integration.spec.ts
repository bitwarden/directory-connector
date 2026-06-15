/**
 * @jest-environment node
 */
import { config as dotenvConfig } from "dotenv";
import { mock, MockProxy } from "jest-mock-extended";

import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { StateService } from "@/libs/abstractions/state.service";

import {
  getEntraIdConfiguration,
  getSyncConfiguration,
} from "../../../utils/entra/config-fixtures";
import { allGroupFixtures, filteredGroupFixtures } from "../../../utils/entra/group-fixtures";
import { allUserFixtures, groupAUserFixtures } from "../../../utils/entra/user-fixtures";
import { DirectoryType } from "../../enums/directoryType";

import { EntraIdDirectoryService } from "./entra-id-directory.service";

// These tests integrate with a test Microsoft Entra ID tenant.
// Credentials are located in the shared Bitwarden collection for Directory Connector testing.
// Place the .env file attachment in the utils folder.

// Load .env variables
dotenvConfig({ path: "utils/.env" });

// This filter targets integration test data.
// It should return data that matches the fixtures exactly.
const INTEGRATION_GROUP_FILTER = "include: Integration Testing Group A";

// These tests are slow!
// Increase the default timeout from 5s to 30s
jest.setTimeout(30000);

describe("entraIdDirectoryService", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;

  let directoryService: EntraIdDirectoryService;

  beforeEach(() => {
    logService = mock();
    i18nService = mock();
    stateService = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.EntraID);
    stateService.getDirectory
      .calledWith(DirectoryType.EntraID)
      .mockResolvedValue(getEntraIdConfiguration());
    stateService.getUserDelta.mockResolvedValue(null); // do not use delta link, fetch from scratch
    i18nService.t.mockImplementation((id) => id); // passthrough for error messages

    directoryService = new EntraIdDirectoryService(logService, i18nService, stateService);
  });

  it("syncs without filters (includes integration test data)", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));

    const [groups, users] = await directoryService.getEntries(true, true);

    expect(groups).toEqual(expect.arrayContaining(allGroupFixtures));
    expect(users).toEqual(expect.arrayContaining(allUserFixtures));
  });

  it("syncs users only (no groups)", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: false }));

    const [groups, users] = await directoryService.getEntries(true, true);

    expect(groups).toBeUndefined();
    expect(users).toEqual(expect.arrayContaining(allUserFixtures));
  });

  it("syncs groups only (no users)", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: false, groups: true }));

    const [groups, users] = await directoryService.getEntries(true, true);

    expect(groups).toEqual(expect.arrayContaining(allGroupFixtures));
    expect(users).toBeUndefined();
  });

  it("syncs using group filter (exact match for integration test data)", async () => {
    stateService.getSync.mockResolvedValue(
      getSyncConfiguration({ users: true, groups: true, groupFilter: INTEGRATION_GROUP_FILTER }),
    );

    const result = await directoryService.getEntries(true, true);

    expect(result).toEqual([filteredGroupFixtures, groupAUserFixtures]);
  });

  it("throws when credentials are invalid", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.EntraID)
      .mockResolvedValue(getEntraIdConfiguration({ key: "bad-secret" }));
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));

    await expect(directoryService.getEntries(true, true)).rejects.toThrow();
  });
});
