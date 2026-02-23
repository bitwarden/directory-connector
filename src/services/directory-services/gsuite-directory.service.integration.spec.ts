import { config as dotenvConfig } from "dotenv";
import { mock, MockProxy } from "jest-mock-extended";

import { StateServiceVNext } from "@/src/abstractions/state-vNext.service";

import { I18nService } from "../../../jslib/common/src/abstractions/i18n.service";
import { LogService } from "../../../jslib/common/src/abstractions/log.service";
import {
  getGSuiteConfiguration,
  getSyncConfiguration,
} from "../../../utils/google-workspace/config-fixtures";
import { groupFixtures } from "../../../utils/google-workspace/group-fixtures";
import { userFixtures } from "../../../utils/google-workspace/user-fixtures";
import { DirectoryType } from "../../enums/directoryType";

import { GSuiteDirectoryService } from "./gsuite-directory.service";

// These tests integrate with a test Google Workspace instance.
// Credentials are located in the shared Bitwarden collection for Directory Connector testing.
// Place the .env file attachment in the utils folder.

// Load .env variables
dotenvConfig({ path: "utils/.env" });

// These filters target integration test data.
// These should return data that matches the user and group fixtures exactly.
// There may be additional data present if not used.
const INTEGRATION_USER_FILTER = "|orgUnitPath='/Integration testing'";
const INTEGRATION_GROUP_FILTER = "|name:Integration*";

// These tests are slow!
// Increase the default timeout from 5s to 15s
jest.setTimeout(15000);

describe("gsuiteDirectoryService", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateServiceVNext>;

  let directoryService: GSuiteDirectoryService;

  beforeEach(() => {
    logService = mock();
    i18nService = mock();
    stateService = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.GSuite);
    stateService.getLastUserSync.mockResolvedValue(null); // do not filter results by last modified date
    i18nService.t.mockImplementation((id) => id); // passthrough implementation for any error  messages

    directoryService = new GSuiteDirectoryService(logService, i18nService, stateService);
  });

  it("syncs without using filters (includes test data)", async () => {
    const directoryConfig = getGSuiteConfiguration();
    stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(directoryConfig);

    const syncConfig = getSyncConfiguration({
      groups: true,
      users: true,
    });
    stateService.getSync.mockResolvedValue(syncConfig);

    const result = await directoryService.getEntries(true, true);

    expect(result[0]).toEqual(expect.arrayContaining(groupFixtures));
    expect(result[1]).toEqual(expect.arrayContaining(userFixtures));
  });

  it("syncs using user and group filters (exact match for test data)", async () => {
    const directoryConfig = getGSuiteConfiguration();
    stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(directoryConfig);

    const syncConfig = getSyncConfiguration({
      groups: true,
      users: true,
      userFilter: INTEGRATION_USER_FILTER,
      groupFilter: INTEGRATION_GROUP_FILTER,
    });
    stateService.getSync.mockResolvedValue(syncConfig);

    const result = await directoryService.getEntries(true, true);

    expect(result).toEqual([groupFixtures, userFixtures]);
  });
});
