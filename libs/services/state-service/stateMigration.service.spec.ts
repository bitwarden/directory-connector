import { DirectoryType } from "@/libs/enums/directoryType";
import { StateVersion } from "@/libs/enums/stateVersion";
import { SecureStorageKeys, StorageKeys } from "@/libs/models/state.model";

import { StateMigrationService } from "./stateMigration.service";

jest.mock("dc-native", () => ({
  passwords: {
    migrateKeytarPassword: jest.fn().mockResolvedValue(false),
    migrateKeytarPasswordAs: jest.fn().mockResolvedValue(false),
    migrateLegacyKeytarAccounts: jest.fn().mockResolvedValue([]),
  },
}));

import { FakeStorageService } from "@/utils/fakeStorageService";

function makeService(
  storage: FakeStorageService,
  secureStorage: FakeStorageService,
): StateMigrationService {
  return new StateMigrationService(storage, secureStorage);
}

describe("StateMigrationService", () => {
  let storage: FakeStorageService;
  let secureStorage: FakeStorageService;
  let svc: StateMigrationService;

  beforeEach(() => {
    storage = new FakeStorageService();
    secureStorage = new FakeStorageService();
    svc = makeService(storage, secureStorage);
  });

  describe("needsMigration()", () => {
    it("returns false when stateVersion key is absent and no global key (fresh install)", async () => {
      // No keys set at all — treat as fresh install, no migration needed
      expect(await svc.needsMigration()).toBe(false);
    });

    it("returns true when stateVersion is StateVersion.Four", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Four);

      expect(await svc.needsMigration()).toBe(true);
    });

    it("returns false when stateVersion is StateVersion.Six (Latest)", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Six);

      expect(await svc.needsMigration()).toBe(false);
    });

    it("falls back to globals.stateVersion when flat stateVersion key is absent", async () => {
      storage.store.set("global", { stateVersion: StateVersion.Four });

      expect(await svc.needsMigration()).toBe(true);
    });

    it("returns false when globals.stateVersion is StateVersion.Six (Latest)", async () => {
      storage.store.set("global", { stateVersion: StateVersion.Six });

      expect(await svc.needsMigration()).toBe(false);
    });

    it("returns false when globals exists but has no stateVersion (treated as fresh install)", async () => {
      storage.store.set("global", { window: { width: 1024 } });

      expect(await svc.needsMigration()).toBe(false);
    });
  });

  describe("migrate()", () => {
    it("throws when stateVersion is below StateVersion.Three (MinSupportedStateVersion)", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Two);

      await expect(svc.migrate()).rejects.toThrow(
        "Your Directory Connector data is too old to migrate",
      );
    });

    it("runs all migrations when stateVersion is StateVersion.Four", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Four);

      await svc.migrate();

      expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Six);
    });

    it("runs migrateStateFrom5To6 when stateVersion is StateVersion.Five", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Five);

      await svc.migrate();

      expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Six);
    });

    it("does nothing (no extra writes) when stateVersion is already StateVersion.Six", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Six);
      const storeSnapshot = new Map(storage.store);

      await svc.migrate();

      expect(storage.store).toEqual(storeSnapshot);
    });
  });

  describe("migrateStateFrom4To5()", () => {
    describe("no account (null activeUserId)", () => {
      it("writes only stateVersion = Six, no other keys", async () => {
        // Seed stateVersion = Four, but no activeUserId and no account data
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);

        await svc.migrate();

        expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Six);
        // Only stateVersion written — nothing else
        expect(storage.store.size).toBe(1);
        expect(secureStorage.store.size).toBe(0);
      });
    });

    describe("full account (happy path)", () => {
      const userId = "user-abc-123";

      beforeEach(() => {
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: { apiKeyClientId: "organization.client-id" },
          keys: { apiKeyClientSecret: "client-secret" },
          directoryConfigurations: {
            ldap: { hostname: "ldap.example.com", port: 389 },
            gsuite: { domain: "example.com", clientEmail: "sa@example.com" },
            entra: { tenant: "entra-tenant", applicationId: "entra-app-id" },
            okta: { orgUrl: "https://example.okta.com" },
            oneLogin: { region: "us", clientId: "ol-client-id" },
          },
          directorySettings: {
            organizationId: "org-123",
            directoryType: DirectoryType.Ldap,
            sync: { users: true, groups: true },
            lastUserSync: "2024-01-01T00:00:00.000Z",
            lastGroupSync: "2024-06-15T12:00:00.000Z",
            lastSyncHash: "hash-abc",
            userDelta: "user-delta-token",
            groupDelta: "group-delta-token",
            syncingDir: false,
          },
        });
        storage.store.set("global", {
          window: { width: 1024, height: 768 },
          enableAlwaysOnTop: false,
          enableTray: true,
          enableMinimizeToTray: true,
          enableCloseToTray: false,
          alwaysShowDock: true,
          environmentUrls: { base: "https://vault.example.com" },
        });

        // Legacy v4 key names (before this migration)
        secureStorage.store.set(`${userId}_ldapPassword`, "ldap-pass");
        secureStorage.store.set(`${userId}_gsuitePrivateKey`, "gsuite-key");
        secureStorage.store.set(`${userId}_entraIdKey`, "entra-key");
        secureStorage.store.set(`${userId}_azureKey`, "azure-key");
        secureStorage.store.set(`${userId}_oktaToken`, "okta-token");
        secureStorage.store.set(`${userId}_oneLoginClientSecret`, "onelogin-secret");
        secureStorage.store.set(`${userId}_accessToken`, "access-tok");
        secureStorage.store.set(`${userId}_refreshToken`, "refresh-tok");
        secureStorage.store.set(`${userId}_twoFactorToken`, "2fa-tok");
      });

      it("migrates directory configurations to flat storage keys", async () => {
        await svc.migrate();

        expect(storage.store.get(StorageKeys.directoryLdap)).toMatchObject({
          hostname: "ldap.example.com",
          port: 389,
        });
        expect(storage.store.get(StorageKeys.directoryGsuite)).toMatchObject({
          domain: "example.com",
        });
        expect(storage.store.get(StorageKeys.directoryEntra)).toMatchObject({
          tenant: "entra-tenant",
          applicationId: "entra-app-id",
        });
        expect(storage.store.get(StorageKeys.directoryOkta)).toMatchObject({
          orgUrl: "https://example.okta.com",
        });
        expect(storage.store.get(StorageKeys.directoryOnelogin)).toMatchObject({
          region: "us",
          clientId: "ol-client-id",
        });
      });

      it("migrates directory settings to flat storage keys", async () => {
        await svc.migrate();

        expect(storage.store.get(StorageKeys.organizationId)).toBe("org-123");
        expect(storage.store.get(StorageKeys.directoryType)).toBe(DirectoryType.Ldap);
        expect(storage.store.get(StorageKeys.sync)).toEqual({ users: true, groups: true });
        expect(storage.store.get(StorageKeys.syncingDir)).toBe(false);
      });

      it("migrates sync metadata to regular storage", async () => {
        await svc.migrate();

        expect(storage.store.get(StorageKeys.lastUserSync)).toBe("2024-01-01T00:00:00.000Z");
        expect(storage.store.get(StorageKeys.lastGroupSync)).toBe("2024-06-15T12:00:00.000Z");
        expect(storage.store.get(StorageKeys.lastSyncHash)).toBe("hash-abc");
        expect(storage.store.get(StorageKeys.userDelta)).toBe("user-delta-token");
        expect(storage.store.get(StorageKeys.groupDelta)).toBe("group-delta-token");
      });

      it("migrates window/tray settings from globals to flat keys", async () => {
        await svc.migrate();

        expect(storage.store.get(StorageKeys.window)).toEqual({ width: 1024, height: 768 });
        expect(storage.store.get(StorageKeys.enableAlwaysOnTop)).toBe(false);
        expect(storage.store.get(StorageKeys.enableTray)).toBe(true);
        expect(storage.store.get(StorageKeys.enableMinimizeToTray)).toBe(true);
        expect(storage.store.get(StorageKeys.enableCloseToTray)).toBe(false);
        expect(storage.store.get(StorageKeys.alwaysShowDock)).toBe(true);
      });

      it("migrates environment URLs from account settings", async () => {
        await svc.migrate();

        expect(storage.store.get(StorageKeys.environmentUrls)).toEqual({
          base: "https://vault.example.com",
        });
      });

      it("calls migrateKeytarPasswordAs for each old {userId}_* key to copy and re-encode", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { passwords } = require("dc-native");
        jest.clearAllMocks();
        passwords.migrateKeytarPasswordAs.mockResolvedValue(true);
        passwords.migrateKeytarPassword.mockResolvedValue(false);
        passwords.migrateLegacyKeytarAccounts.mockResolvedValue([]);

        await svc.migrate();

        const calls: [string, string, string][] = passwords.migrateKeytarPasswordAs.mock.calls;
        const calledPairs = calls.map(([, old, newKey]) => ({ old, new: newKey }));

        expect(calledPairs).toEqual(
          expect.arrayContaining([
            { old: `${userId}_ldapPassword`, new: SecureStorageKeys.ldap },
            { old: `${userId}_gsuitePrivateKey`, new: SecureStorageKeys.gsuite },
            { old: `${userId}_azureKey`, new: SecureStorageKeys.azure },
            { old: `${userId}_entraIdKey`, new: SecureStorageKeys.entra },
            { old: `${userId}_entraKey`, new: SecureStorageKeys.entra },
            { old: `${userId}_oktaToken`, new: SecureStorageKeys.okta },
            { old: `${userId}_oneLoginClientSecret`, new: SecureStorageKeys.oneLogin },
            { old: `${userId}_accessToken`, new: SecureStorageKeys.accessToken },
            { old: `${userId}_refreshToken`, new: SecureStorageKeys.refreshToken },
            { old: `${userId}_twoFactorToken`, new: SecureStorageKeys.twoFactorToken },
          ]),
        );

        // Old prefixed keys removed from secureStorageService after migration
        expect(secureStorage.store.has(`${userId}_ldapPassword`)).toBe(false);
        expect(secureStorage.store.has(`${userId}_gsuitePrivateKey`)).toBe(false);
        expect(secureStorage.store.has(`${userId}_entraIdKey`)).toBe(false);
        expect(secureStorage.store.has(`${userId}_azureKey`)).toBe(false);
        expect(secureStorage.store.has(`${userId}_oktaToken`)).toBe(false);
        expect(secureStorage.store.has(`${userId}_oneLoginClientSecret`)).toBe(false);
        expect(secureStorage.store.has(`${userId}_accessToken`)).toBe(false);
        expect(secureStorage.store.has(`${userId}_refreshToken`)).toBe(false);
        expect(secureStorage.store.has(`${userId}_twoFactorToken`)).toBe(false);
      });

      it("removes stale v3 storage keys (activeUserId, account object, global) after migration", async () => {
        await svc.migrate();

        expect(storage.store.has("activeUserId")).toBe(false);
        expect(storage.store.has(userId)).toBe(false);
        expect(storage.store.has("global")).toBe(false);
      });

      it("migrates apiKeyClientId and apiKeyClientSecret from account to secure storage", async () => {
        await svc.migrate();

        expect(secureStorage.store.get(SecureStorageKeys.apiKeyClientId)).toBe(
          "organization.client-id",
        );
        expect(secureStorage.store.get(SecureStorageKeys.apiKeyClientSecret)).toBe("client-secret");
      });

      it("sets stateVersion to StateVersion.Six after all migrations", async () => {
        await svc.migrate();

        expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Six);
      });
    });

    describe("GSuite privateKey in prefixed secure storage", () => {
      it("calls migrateKeytarPasswordAs for gsuite private key", async () => {
        const userId = "user-gsuite-key";
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { passwords } = require("dc-native");
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directoryConfigurations: { gsuite: { domain: "example.com" } },
          directorySettings: {},
        });

        await svc.migrate();

        expect(passwords.migrateKeytarPasswordAs).toHaveBeenCalledWith(
          expect.any(String),
          `${userId}_gsuitePrivateKey`,
          SecureStorageKeys.gsuite,
        );
        const gsuiteConfig = storage.store.get(StorageKeys.directoryGsuite) as any;
        expect(gsuiteConfig.domain).toBe("example.com");
      });
    });

    describe("Entra key in prefixed secure storage", () => {
      it("calls migrateKeytarPasswordAs for both entraIdKey and entraKey", async () => {
        const userId = "user-entra-key";
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { passwords } = require("dc-native");
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directoryConfigurations: { entra: { tenant: "my-tenant", applicationId: "app-id" } },
          directorySettings: {},
        });

        await svc.migrate();

        expect(passwords.migrateKeytarPasswordAs).toHaveBeenCalledWith(
          expect.any(String),
          `${userId}_entraIdKey`,
          SecureStorageKeys.entra,
        );
        expect(passwords.migrateKeytarPasswordAs).toHaveBeenCalledWith(
          expect.any(String),
          `${userId}_entraKey`,
          SecureStorageKeys.entra,
        );
        const entraConfig = storage.store.get(StorageKeys.directoryEntra) as any;
        expect(entraConfig.tenant).toBe("my-tenant");
      });

      it("calls migrateKeytarPasswordAs for azure key", async () => {
        const userId = "user-azure-key";
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { passwords } = require("dc-native");
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directoryConfigurations: {
            azure: { tenant: "azure-tenant", applicationId: "azure-app" },
          },
          directorySettings: {},
        });

        await svc.migrate();

        expect(passwords.migrateKeytarPasswordAs).toHaveBeenCalledWith(
          expect.any(String),
          `${userId}_azureKey`,
          SecureStorageKeys.azure,
        );
        const entraConfig = storage.store.get(StorageKeys.directoryEntra) as any;
        expect(entraConfig.tenant).toBe("azure-tenant");
      });
    });

    describe("Okta token in prefixed secure storage", () => {
      it("calls migrateKeytarPasswordAs for okta token", async () => {
        const userId = "user-okta-token";
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { passwords } = require("dc-native");
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directoryConfigurations: { okta: { orgUrl: "https://example.okta.com" } },
          directorySettings: {},
        });

        await svc.migrate();

        expect(passwords.migrateKeytarPasswordAs).toHaveBeenCalledWith(
          expect.any(String),
          `${userId}_oktaToken`,
          SecureStorageKeys.okta,
        );
        const oktaConfig = storage.store.get(StorageKeys.directoryOkta) as any;
        expect(oktaConfig.orgUrl).toBe("https://example.okta.com");
      });
    });

    describe("OneLogin clientSecret in prefixed secure storage", () => {
      it("calls migrateKeytarPasswordAs for oneLogin client secret", async () => {
        const userId = "user-onelogin-secret";
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { passwords } = require("dc-native");
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directoryConfigurations: { oneLogin: { clientId: "ol-client-id", region: "us" } },
          directorySettings: {},
        });

        await svc.migrate();

        expect(passwords.migrateKeytarPasswordAs).toHaveBeenCalledWith(
          expect.any(String),
          `${userId}_oneLoginClientSecret`,
          SecureStorageKeys.oneLogin,
        );
        const oneLoginConfig = storage.store.get(StorageKeys.directoryOnelogin) as any;
        expect(oneLoginConfig.clientId).toBe("ol-client-id");
      });
    });

    describe("LDAP password in prefixed secure storage", () => {
      it("calls migrateKeytarPasswordAs for ldap password", async () => {
        const userId = "user-ldap-pass";
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { passwords } = require("dc-native");
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directoryConfigurations: { ldap: { hostname: "ldap.example.com", port: 389 } },
          directorySettings: {},
        });

        await svc.migrate();

        expect(passwords.migrateKeytarPasswordAs).toHaveBeenCalledWith(
          expect.any(String),
          `${userId}_ldapPassword`,
          SecureStorageKeys.ldap,
        );
        const ldapConfig = storage.store.get(StorageKeys.directoryLdap) as any;
        expect(ldapConfig.hostname).toBe("ldap.example.com");
      });

      it("does not overwrite an existing secure storage LDAP secret with StoredSecurely placeholder", async () => {
        const userId = "user-ldap-placeholder";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directoryConfigurations: {
            ldap: { hostname: "ldap.example.com", password: "[STORED SECURELY]" },
          },
          directorySettings: {},
          settings: {},
        });
        await svc.migrate();

        // migrateKeytarPasswordAs is called for the ldap key regardless of the
        // [STORED SECURELY] placeholder — it reads directly from the credential store.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { passwords } = require("dc-native");
        expect(passwords.migrateKeytarPasswordAs).toHaveBeenCalledWith(
          expect.any(String),
          `${userId}_ldapPassword`,
          SecureStorageKeys.ldap,
        );
      });
    });

    describe("azure fallback (no entra, only azure in directoryConfigurations)", () => {
      it("populates directoryEntra from azure config when entra is absent", async () => {
        const userId = "user-abc-123";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directoryConfigurations: {
            azure: { tenant: "tenant-id", applicationId: "app-id" },
          },
          directorySettings: {},
          settings: {},
        });

        await svc.migrate();

        expect(storage.store.get(StorageKeys.directoryEntra)).toMatchObject({
          tenant: "tenant-id",
          applicationId: "app-id",
        });
      });

      it("prefers entra over azure when both are present", async () => {
        const userId = "user-abc-123";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directoryConfigurations: {
            entra: { tenant: "entra-tenant", applicationId: "entra-app" },
            azure: { tenant: "azure-tenant", applicationId: "azure-app" },
          },
          directorySettings: {},
          settings: {},
        });

        await svc.migrate();

        expect(storage.store.get(StorageKeys.directoryEntra)).toMatchObject({
          tenant: "entra-tenant",
          applicationId: "entra-app",
        });
      });
    });

    describe("partial data (only some fields populated)", () => {
      it("migrates only the fields present without throwing", async () => {
        const userId = "user-abc-123";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directorySettings: {
            organizationId: "org-456",
            directoryType: DirectoryType.GSuite,
          },
          // No directoryConfigurations, no globals, no settings
        });

        await expect(svc.migrate()).resolves.not.toThrow();

        expect(storage.store.get(StorageKeys.organizationId)).toBe("org-456");
        expect(storage.store.get(StorageKeys.directoryType)).toBe(DirectoryType.GSuite);
        // No directory configs written
        expect(storage.store.has(StorageKeys.directoryLdap)).toBe(false);
        expect(storage.store.has(StorageKeys.directoryGsuite)).toBe(false);
        // No window settings written
        expect(storage.store.has(StorageKeys.window)).toBe(false);
        // stateVersion still updated
        expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Six);
      });
    });

    describe("useSecureStorageForSecrets = false", () => {
      it("does not migrate or remove {userId}_* secure storage keys", async () => {
        jest.clearAllMocks();
        const userId = "user-abc-123";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          profile: {},
          keys: {},
          directorySettings: { organizationId: "org-789" },
        });
        secureStorage.store.set(`${userId}_accessToken`, "access-tok");
        secureStorage.store.set(`${userId}_ldapPassword`, "ldap-pass");

        // Access migrateStateFrom4To5 via a subclass to pass false
        class TestableService extends StateMigrationService {
          async runMigration(): Promise<void> {
            await this.migrateStateFrom3To5(false);
          }
        }
        const testSvc = new TestableService(storage, secureStorage);
        await testSvc.runMigration();

        // Old keys NOT removed and migrateKeytarPasswordAs NOT called
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { passwords } = require("dc-native");
        expect(passwords.migrateKeytarPasswordAs).not.toHaveBeenCalled();
        expect(secureStorage.store.has(`${userId}_accessToken`)).toBe(true);
        expect(secureStorage.store.has(`${userId}_ldapPassword`)).toBe(true);
      });
    });

    describe("migrateStateFrom5To6()", () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { passwords } = require("dc-native");

      beforeEach(() => {
        jest.clearAllMocks();
        storage.store.set(StorageKeys.stateVersion, StateVersion.Five);
      });

      it("calls migrateKeytarPassword with the new flat SecureStorageKeys", async () => {
        await svc.migrate();

        const calledKeys = passwords.migrateKeytarPassword.mock.calls.map(
          (c: [string, string]) => c[1],
        );
        expect(calledKeys).toEqual(
          expect.arrayContaining([
            SecureStorageKeys.ldap,
            SecureStorageKeys.gsuite,
            SecureStorageKeys.azure,
            SecureStorageKeys.entra,
            SecureStorageKeys.okta,
            SecureStorageKeys.oneLogin,
          ]),
        );
      });

      it("does not call migrateKeytarPassword with new-style {userId}_secret* keys", async () => {
        const userId = "user-abc-123";
        storage.store.set("activeUserId", userId);

        await svc.migrate();

        const calledKeys = passwords.migrateKeytarPassword.mock.calls.map(
          (c: [string, string]) => c[1],
        );
        // None of the called keys should use the new SecureStorageKeys values as a suffix
        const badKeys = calledKeys.filter(
          (key: string) =>
            key.startsWith(`${userId}_secret`) ||
            key === `${userId}_${SecureStorageKeys.ldap}` ||
            key === `${userId}_${SecureStorageKeys.gsuite}`,
        );
        expect(badKeys).toHaveLength(0);
      });

      it("bumps stateVersion to Six", async () => {
        await svc.migrate();

        expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Six);
      });
    });

    describe("stampVersion()", () => {
      it("writes stateVersion = Latest when stateVersion is absent (fresh install)", async () => {
        await svc.stampVersion();

        expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Six);
      });

      it("does not overwrite an existing stateVersion", async () => {
        storage.store.set(StorageKeys.stateVersion, StateVersion.Five);

        await svc.stampVersion();

        expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Five);
      });
    });

    describe("getCurrentStateVersion() (tested indirectly via needsMigration)", () => {
      it("returns StateVersion.Latest (no migration needed) when both flat key and globals are absent (fresh install)", async () => {
        // Completely empty storage — treat as fresh install
        expect(await svc.needsMigration()).toBe(false);
      });

      it("prefers flat stateVersion key over globals.stateVersion", async () => {
        storage.store.set(StorageKeys.stateVersion, StateVersion.Six);
        storage.store.set("global", { stateVersion: StateVersion.Four });

        // Flat key wins → at latest → no migration needed
        expect(await svc.needsMigration()).toBe(false);
      });
    });
  });
});
