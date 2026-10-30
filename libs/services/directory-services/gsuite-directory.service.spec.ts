/**
 * @jest-environment node
 */
import { mock, MockProxy } from "jest-mock-extended";

import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { StateService } from "@/libs/abstractions/state.service";

import { DirectoryType } from "../../enums/directoryType";
import { GSuiteConfiguration } from "../../models/gsuiteConfiguration";
import { SyncConfiguration } from "../../models/syncConfiguration";

import { GSuiteDirectoryService } from "./gsuite-directory.service";

const usersList = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    admin: jest.fn().mockImplementation(() => ({
      users: { list: (...args: unknown[]) => usersList(...args) },
    })),
    auth: {
      JWT: jest.fn().mockImplementation(() => ({
        authorize: jest.fn().mockResolvedValue({}),
      })),
    },
  },
}));

describe("gsuiteDirectoryService", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;

  let directoryService: GSuiteDirectoryService;

  const getConfiguration = (domain: string, customer: string) => {
    const config = new GSuiteConfiguration();
    config.clientEmail = "service-account@example.iam.gserviceaccount.com";
    config.privateKey = "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n";
    config.adminUser = "admin@example.com";
    config.domain = domain;
    config.customer = customer;
    return config;
  };

  const setConfiguration = (config: GSuiteConfiguration) => {
    stateService.getDirectory.calledWith(DirectoryType.GSuite).mockResolvedValue(config);

    const syncConfig = new SyncConfiguration();
    syncConfig.users = true;
    stateService.getSync.mockResolvedValue(syncConfig);
  };

  const usersListParams = () => usersList.mock.calls[0][0] as Record<string, unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    usersList.mockResolvedValue({ status: 200, data: { users: [], nextPageToken: null } });

    logService = mock();
    i18nService = mock();
    stateService = mock();

    stateService.getDirectoryType.mockResolvedValue(DirectoryType.GSuite);
    i18nService.t.mockImplementation((id) => id);

    directoryService = new GSuiteDirectoryService(logService, i18nService, stateService);
  });

  describe("configuration validation", () => {
    it("throws when neither domain nor customer is configured", async () => {
      setConfiguration(getConfiguration(null, null));

      await expect(directoryService.getEntries(true, true)).rejects.toThrow("dirConfigIncomplete");
      expect(usersList).not.toHaveBeenCalled();
    });

    it("does not throw when only customer is configured", async () => {
      setConfiguration(getConfiguration(null, "C01234567"));

      await expect(directoryService.getEntries(true, true)).resolves.toBeDefined();
    });

    it("does not throw when only domain is configured", async () => {
      setConfiguration(getConfiguration("example.com", null));

      await expect(directoryService.getEntries(true, true)).resolves.toBeDefined();
    });
  });

  describe("directory query scoping", () => {
    it("queries by customer when only customer is configured", async () => {
      setConfiguration(getConfiguration(null, "C01234567"));

      await directoryService.getEntries(true, true);

      expect(usersListParams().customer).toBe("C01234567");
      expect(usersListParams()).not.toHaveProperty("domain");
    });

    it("queries by domain when only domain is configured", async () => {
      setConfiguration(getConfiguration("example.com", null));

      await directoryService.getEntries(true, true);

      expect(usersListParams().domain).toBe("example.com");
      expect(usersListParams()).not.toHaveProperty("customer");
    });

    it("queries by domain when both domain and customer are configured", async () => {
      setConfiguration(getConfiguration("example.com", "C01234567"));

      await directoryService.getEntries(true, true);

      expect(usersListParams().domain).toBe("example.com");
      expect(usersListParams()).not.toHaveProperty("customer");
    });
  });
});
