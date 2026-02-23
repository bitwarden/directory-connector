import { mock } from "jest-mock-extended";

import { StorageService } from "@/jslib/common/src/abstractions/storage.service";
import { StateVersion } from "@/jslib/common/src/enums/stateVersion";
import { StateFactory } from "@/jslib/common/src/factories/stateFactory";

import { Account, DirectoryConfigurations, DirectorySettings } from "../models/account";

import { StateMigrationService } from "./state-service/stateMigration.service";

describe("StateMigrationService - v4 to v5 migration", () => {
  let storageService: jest.Mocked<StorageService>;
  let secureStorageService: jest.Mocked<StorageService>;
  let stateFactory: jest.Mocked<StateFactory<any, Account>>;
  let migrationService: StateMigrationService;

  beforeEach(() => {
    storageService = mock<StorageService>();
    secureStorageService = mock<StorageService>();
    stateFactory = mock<StateFactory<any, Account>>();

    migrationService = new StateMigrationService(
      storageService,
      secureStorageService,
      stateFactory,
    );
  });

  it("should flatten nested account structure", async () => {
    const userId = "test-user-id";
    const oldAccount = {
      profile: {
        userId: userId,
        entityId: userId,
        apiKeyClientId: "organization.CLIENT_ID",
      },
      tokens: {
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
      },
      keys: {
        apiKeyClientSecret: "test-secret",
      },
      directoryConfigurations: new DirectoryConfigurations(),
      directorySettings: new DirectorySettings(),
    };

    storageService.get.mockImplementation((key: string) => {
      if (key === "authenticatedAccounts") {
        return Promise.resolve([userId]);
      }
      if (key === userId) {
        return Promise.resolve(oldAccount);
      }
      if (key === "global") {
        return Promise.resolve({ stateVersion: StateVersion.Four });
      }
      return Promise.resolve(null);
    });

    await migrationService["migrateStateFrom4To5"]();

    expect(storageService.save).toHaveBeenCalledWith(
      "global",
      expect.objectContaining({ stateVersion: StateVersion.Five }),
      expect.anything(),
    );
  });

  it("should handle missing nested objects gracefully", async () => {
    const userId = "test-user-id";
    const partialAccount = {
      directoryConfigurations: new DirectoryConfigurations(),
      directorySettings: new DirectorySettings(),
    };

    storageService.get.mockImplementation((key: string) => {
      if (key === "authenticatedAccounts") {
        return Promise.resolve([userId]);
      }
      if (key === userId) {
        return Promise.resolve(partialAccount);
      }
      if (key === "global") {
        return Promise.resolve({ stateVersion: StateVersion.Four });
      }
      return Promise.resolve(null);
    });

    await migrationService["migrateStateFrom4To5"]();

    expect(storageService.save).toHaveBeenCalledWith(
      "global",
      expect.objectContaining({ stateVersion: StateVersion.Five }),
      expect.anything(),
    );
  });

  it("should handle empty account list", async () => {
    storageService.get.mockImplementation((key: string) => {
      if (key === "authenticatedAccounts") {
        return Promise.resolve([]);
      }
      if (key === "global") {
        return Promise.resolve({ stateVersion: StateVersion.Four });
      }
      return Promise.resolve(null);
    });

    await migrationService["migrateStateFrom4To5"]();

    expect(storageService.save).toHaveBeenCalledWith(
      "global",
      expect.objectContaining({ stateVersion: StateVersion.Five }),
      expect.anything(),
    );
    expect(storageService.save).toHaveBeenCalledTimes(1);
  });

  it("should preserve directory configurations and settings", async () => {
    const userId = "test-user-id";
    const directoryConfigs = new DirectoryConfigurations();
    directoryConfigs.ldap = { host: "ldap.example.com" } as any;

    const directorySettings = new DirectorySettings();
    directorySettings.organizationId = "org-123";
    directorySettings.lastSyncHash = "hash-abc";

    const oldAccount = {
      profile: { userId: userId },
      tokens: {},
      keys: {},
      directoryConfigurations: directoryConfigs,
      directorySettings: directorySettings,
    };

    storageService.get.mockImplementation((key: string) => {
      if (key === "authenticatedAccounts") {
        return Promise.resolve([userId]);
      }
      if (key === userId) {
        return Promise.resolve(oldAccount);
      }
      if (key === "global") {
        return Promise.resolve({ stateVersion: StateVersion.Four });
      }
      return Promise.resolve(null);
    });

    await migrationService["migrateStateFrom4To5"]();

    expect(storageService.save).toHaveBeenCalledWith(
      "directory_ldap",
      { host: "ldap.example.com" },
      expect.anything(),
    );
    expect(storageService.save).toHaveBeenCalledWith(
      "organizationId",
      "org-123",
      expect.anything(),
    );
    expect(storageService.save).toHaveBeenCalledWith("lastSyncHash", "hash-abc", expect.anything());
  });

  it("should update state version after successful migration", async () => {
    const userId = "test-user-id";
    const oldAccount = {
      profile: { userId: userId },
      tokens: {},
      keys: {},
      directoryConfigurations: new DirectoryConfigurations(),
      directorySettings: new DirectorySettings(),
    };

    storageService.get.mockImplementation((key: string) => {
      if (key === "authenticatedAccounts") {
        return Promise.resolve([userId]);
      }
      if (key === userId) {
        return Promise.resolve(oldAccount);
      }
      if (key === "global") {
        return Promise.resolve({ stateVersion: StateVersion.Four });
      }
      return Promise.resolve(null);
    });

    await migrationService["migrateStateFrom4To5"]();

    expect(storageService.save).toHaveBeenCalledWith(
      "global",
      expect.objectContaining({ stateVersion: StateVersion.Five }),
      expect.anything(),
    );
  });
});
