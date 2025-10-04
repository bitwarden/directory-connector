import { mock, MockProxy } from "jest-mock-extended";

import { I18nService } from "../../jslib/common/src/abstractions/i18n.service";
import { LogService } from "../../jslib/common/src/abstractions/log.service";
import { groupFixtures, userFixtures } from "../../utils/google-workspace-fixtures";
import { DirectoryType } from "../enums/directoryType";
import { getGSuiteConfiguration, getSyncConfiguration } from "../utils/test-fixtures";

import { GSuiteDirectoryService } from "./gsuite-directory.service";
import { StateService } from "./state.service";

// These tests integrate with a test Google Workspace instance.
// To run theses tests:
//  Obtain the Google Workspace credentials from the shared collection
//  Add the required settings to utils/.env
//  Put the private key in utils/google-workspace.pem

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
    // TODO: make this get a valid config
    stateService.getDirectory
      .calledWith(DirectoryType.GSuite)
      .mockResolvedValue(getGSuiteConfiguration());

    // TODO: this sync config looks specific to ldap after all - need a gsuite one
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ groups: true, users: true }));

    const result = await directoryService.getEntries(true, true);
    expect(result).toEqual([groupFixtures, userFixtures]);
  });

  describe("filters", () => {
    it("include user by email", async () => {});

    it("exclude user by email", async () => {});

    it("include group by name", async () => {});

    it("exclude group by name", async () => {});
  });
});
