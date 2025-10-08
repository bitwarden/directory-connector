import { mock, MockProxy } from "jest-mock-extended";

import { I18nService } from "../../jslib/common/src/abstractions/i18n.service";
import { LogService } from "../../jslib/common/src/abstractions/log.service";
import {
  getGSuiteConfiguration,
  getSyncConfiguration,
} from "../../utils/google-workspace/config-fixtures";
import { groupFixtures } from "../../utils/google-workspace/group-fixtures";
import { userFixtures } from "../../utils/google-workspace/user-fixtures";
import { DirectoryType } from "../enums/directoryType";

import { GSuiteDirectoryService } from "./gsuite-directory.service";
import { StateService } from "./state.service";

// These tests integrate with a test Google Workspace instance.
// Credentials are located in the "Google Workspace integration test service account"
// shared Bitwarden item. Place the .env file attachment in the utils folder.

require("dotenv").config({ path: "utils/.env" });

// These filters target integration test data.
// These should return data that matches the user and group fixtures exactly.
// There may be additional data present if not used.
const INTEGRATION_USER_FILTER =
  "exclude:integration-user-a@bwrox.dev|orgUnitPath='/Integration testing'";
const INTEGRATION_GROUP_FILTER = "|name:Integration*";

describe("gsuiteDirectoryService", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;

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

  it("performs a basic sync", async () => {
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

  // describe("filters", () => {
  //   it("include user by email", async () => {});

  //   it("exclude user by email", async () => {});

  //   it("include group by name", async () => {});

  //   it("exclude group by name", async () => {});
  // });
});
