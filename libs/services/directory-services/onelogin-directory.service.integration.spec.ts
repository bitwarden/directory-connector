/**
 * @jest-environment node
 */
import { config as dotenvConfig } from "dotenv";
import { mock, MockProxy } from "jest-mock-extended";

import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { StateService } from "@/libs/abstractions/state.service";

import {
  getOneLoginConfiguration,
  getSyncConfiguration,
} from "../../../utils/onelogin/config-fixtures";
import { allGroupFixtures, integrationRoleFixtures } from "../../../utils/onelogin/group-fixtures";
import {
  allUserFixtures,
  integrationRoleUserFixtures,
} from "../../../utils/onelogin/user-fixtures";
import { DirectoryType } from "../../enums/directoryType";

import { OneLoginDirectoryService } from "./onelogin-directory.service";

// These tests integrate with a test OneLogin organization.
// Credentials are located in the shared Bitwarden collection for Directory Connector testing.
// Place the .env file attachment in the utils folder.

// Load .env variables
dotenvConfig({ path: "utils/.env" });

// This filter targets the integration test role exactly.
const INTEGRATION_GROUP_FILTER = "include: Integration Test Role";

// These tests are slow!
// Increase the default timeout from 5s to 30s
jest.setTimeout(30000);

describe("oneLoginDirectoryService", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;

  let directoryService: OneLoginDirectoryService;

  beforeEach(() => {
    logService = mock();
    i18nService = mock();
    stateService = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.OneLogin);
    stateService.getDirectory
      .calledWith(DirectoryType.OneLogin)
      .mockResolvedValue(getOneLoginConfiguration());
    i18nService.t.mockImplementation((id) => id); // passthrough for error messages

    directoryService = new OneLoginDirectoryService(logService, i18nService, stateService);
  });

  describe("filtered-sync", () => {
    beforeEach(() => {
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          users: true,
          groups: true,
          groupFilter: INTEGRATION_GROUP_FILTER,
        }),
      );
    });

    it("returns an exact snapshot of the integration test role and its members", async () => {
      const [groups, users] = await directoryService.getEntries(true, true);

      expect(groups).toEqual(integrationRoleFixtures);
      expect(groups).toHaveLength(integrationRoleFixtures.length);
      expect(users).toEqual(integrationRoleUserFixtures);
      expect(users).toHaveLength(integrationRoleUserFixtures.length);
    });

    it("marks the suspended/locked user as disabled", async () => {
      const [, users] = await directoryService.getEntries(true, true);

      const suspendedUser = users?.find((u) => u.email === "testuser4@bwrox.dev");
      expect(suspendedUser).toBeDefined();
      expect(suspendedUser?.disabled).toBe(true);
    });

    it("excludes the matching group and its members when using an exclude filter", async () => {
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          users: true,
          groups: true,
          groupFilter: "exclude: Integration Test Role",
        }),
      );

      const [groups, users] = await directoryService.getEntries(true, true);

      expect(groups?.find((g) => g.name === "Integration Test Role")).toBeUndefined();
      // testuser1-4 are only members of Integration Test Role, so group-scoping removes them
      expect(users?.find((u) => u.email.endsWith("@bwrox.dev"))).toBeUndefined();
    });
  });

  describe("user-filter", () => {
    it("include filter returns only the specified users", async () => {
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          users: true,
          groups: false,
          userFilter: "include: testuser1@bwrox.dev, testuser2@bwrox.dev",
        }),
      );

      const [, users] = await directoryService.getEntries(true, true);

      expect(users).toHaveLength(2);
      expect(users?.map((u) => u.email)).toEqual(
        expect.arrayContaining(["testuser1@bwrox.dev", "testuser2@bwrox.dev"]),
      );
    });

    it("exclude filter omits the specified user from results", async () => {
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          users: true,
          groups: false,
          userFilter: "exclude: testuser4@bwrox.dev",
        }),
      );

      const [, users] = await directoryService.getEntries(true, true);

      expect(users?.find((u) => u.email === "testuser4@bwrox.dev")).toBeUndefined();
      expect(users?.find((u) => u.email === "testuser1@bwrox.dev")).toBeDefined();
    });
  });

  describe("groups-only-sync", () => {
    it("returns groups without syncing users", async () => {
      stateService.getSync.mockResolvedValue(
        getSyncConfiguration({
          users: false,
          groups: true,
          groupFilter: INTEGRATION_GROUP_FILTER,
        }),
      );

      const [groups, users] = await directoryService.getEntries(true, true);

      expect(groups).toEqual(integrationRoleFixtures);
      expect(users).toBeUndefined();
    });
  });

  describe("full-sync", () => {
    it("returns all roles and users, including the integration test data", async () => {
      stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));

      const [groups, users] = await directoryService.getEntries(true, true);

      expect(groups).toEqual(expect.arrayContaining(allGroupFixtures));
      expect(users).toEqual(expect.arrayContaining(allUserFixtures));
    });
  });

  describe("invalid-credentials", () => {
    it("rejects with a message containing 'Could not get access token'", async () => {
      stateService.getDirectory.calledWith(DirectoryType.OneLogin).mockResolvedValue(
        getOneLoginConfiguration({
          clientId: "bad-client-id",
          clientSecret: "bad-client-secret",
        }),
      );
      stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));

      await expect(directoryService.getEntries(true, true)).rejects.toThrow(
        "Could not get access token",
      );
    });
  });
});
