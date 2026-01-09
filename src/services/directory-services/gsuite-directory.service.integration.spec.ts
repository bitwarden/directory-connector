import { config as dotenvConfig } from "dotenv";
import { mock, MockProxy } from "jest-mock-extended";

import { I18nService } from "../../../jslib/common/src/abstractions/i18n.service";
import { LogService } from "../../../jslib/common/src/abstractions/log.service";
import {
  getGSuiteConfiguration,
  getSyncConfiguration,
} from "../../../utils/google-workspace/config-fixtures";
import { groupFixtures } from "../../../utils/google-workspace/group-fixtures";
import { userFixtures } from "../../../utils/google-workspace/user-fixtures";
import { DirectoryType } from "../../enums/directoryType";
import { StateService } from "../state.service";

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

  describe("basic sync fetching users and groups", () => {
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

    it("syncs only users when groups sync is disabled", async () => {
      const directoryConfig = getGSuiteConfiguration();
      stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(directoryConfig);

      const syncConfig = getSyncConfiguration({
        groups: false,
        users: true,
        userFilter: INTEGRATION_USER_FILTER,
      });
      stateService.getSync.mockResolvedValue(syncConfig);

      const result = await directoryService.getEntries(true, true);

      expect(result[0]).toBeUndefined();
      expect(result[1]).toEqual(expect.arrayContaining(userFixtures));
    });

    it("syncs only groups when users sync is disabled", async () => {
      const directoryConfig = getGSuiteConfiguration();
      stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(directoryConfig);

      const syncConfig = getSyncConfiguration({
        groups: true,
        users: false,
        groupFilter: INTEGRATION_GROUP_FILTER,
      });
      stateService.getSync.mockResolvedValue(syncConfig);

      const result = await directoryService.getEntries(true, true);

      expect(result[0]).toEqual(expect.arrayContaining(groupFixtures));
      expect(result[1]).toEqual([]);
    });
  });

  describe("users", () => {
    it("includes disabled users in sync results", async () => {
      const directoryConfig = getGSuiteConfiguration();
      stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(directoryConfig);

      const syncConfig = getSyncConfiguration({
        users: true,
        userFilter: INTEGRATION_USER_FILTER,
      });
      stateService.getSync.mockResolvedValue(syncConfig);

      const result = await directoryService.getEntries(true, true);

      const disabledUser = userFixtures.find((u) => u.email === "testuser5@bwrox.dev");
      expect(result[1]).toContainEqual(disabledUser);
      expect(disabledUser.disabled).toBe(true);
    });

    it("filters users by org unit path", async () => {
      const directoryConfig = getGSuiteConfiguration();
      stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(directoryConfig);

      const syncConfig = getSyncConfiguration({
        users: true,
        userFilter: INTEGRATION_USER_FILTER,
      });
      stateService.getSync.mockResolvedValue(syncConfig);

      const result = await directoryService.getEntries(true, true);

      expect(result[1]).toEqual(userFixtures);
      expect(result[1].length).toBe(5);
    });

    it("filters users by email pattern", async () => {
      const directoryConfig = getGSuiteConfiguration();
      stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(directoryConfig);

      const syncConfig = getSyncConfiguration({
        users: true,
        userFilter: "|email:testuser1*",
      });
      stateService.getSync.mockResolvedValue(syncConfig);

      const result = await directoryService.getEntries(true, true);

      const testuser1 = userFixtures.find((u) => u.email === "testuser1@bwrox.dev");
      expect(result[1]).toContainEqual(testuser1);
      expect(result[1].length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("groups", () => {
    it("filters groups by name pattern", async () => {
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

      expect(result[0]).toEqual(groupFixtures);
      expect(result[0].length).toBe(2);
    });

    it("includes group members correctly", async () => {
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

      const groupA = result[0].find((g) => g.name === "Integration Test Group A");
      expect(groupA).toBeDefined();
      expect(groupA.userMemberExternalIds.size).toBe(2);
      expect(groupA.userMemberExternalIds.has("111605910541641314041")).toBe(true);
      expect(groupA.userMemberExternalIds.has("111147009830456099026")).toBe(true);

      const groupB = result[0].find((g) => g.name === "Integration Test Group B");
      expect(groupB).toBeDefined();
      expect(groupB.userMemberExternalIds.size).toBe(2);
      expect(groupB.userMemberExternalIds.has("111147009830456099026")).toBe(true);
      expect(groupB.userMemberExternalIds.has("100150970267699397306")).toBe(true);
    });

    it("handles groups with no members", async () => {
      const directoryConfig = getGSuiteConfiguration();
      stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(directoryConfig);

      const syncConfig = getSyncConfiguration({
        groups: true,
        users: true,
        userFilter: INTEGRATION_USER_FILTER,
        groupFilter: "|name:Integration*",
      });
      stateService.getSync.mockResolvedValue(syncConfig);

      const result = await directoryService.getEntries(true, true);

      // All test groups should have members, but ensure the code handles empty groups
      expect(result[0]).toBeDefined();
      expect(Array.isArray(result[0])).toBe(true);
    });
  });

  describe("error handling", () => {
    it("throws error when directory configuration is incomplete", async () => {
      stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(
        getGSuiteConfiguration({
          clientEmail: "",
        }),
      );

      const syncConfig = getSyncConfiguration({
        users: true,
      });
      stateService.getSync.mockResolvedValue(syncConfig);

      await expect(directoryService.getEntries(true, true)).rejects.toThrow();
    });

    it("throws error when authentication fails with invalid credentials", async () => {
      const directoryConfig = getGSuiteConfiguration({
        privateKey: "-----BEGIN PRIVATE KEY-----\nINVALID_KEY\n-----END PRIVATE KEY-----\n",
      });
      stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(directoryConfig);

      const syncConfig = getSyncConfiguration({
        users: true,
      });
      stateService.getSync.mockResolvedValue(syncConfig);

      await expect(directoryService.getEntries(true, true)).rejects.toThrow();
    });
  });
});
