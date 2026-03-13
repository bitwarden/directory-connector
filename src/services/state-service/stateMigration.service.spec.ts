import { StateVersion } from "@/jslib/common/src/enums/stateVersion";

import { DirectoryType } from "@/src/enums/directoryType";
import { SecureStorageKeys, StorageKeys } from "@/src/models/state.model";
import { FakeStorageService } from "@/src/utils/fakeStorageService";

import { StateMigrationService } from "./stateMigration.service";

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

    it("returns false when stateVersion is StateVersion.Five (Latest)", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Five);

      expect(await svc.needsMigration()).toBe(false);
    });

    it("falls back to globals.stateVersion when flat stateVersion key is absent", async () => {
      storage.store.set("global", { stateVersion: StateVersion.Four });

      expect(await svc.needsMigration()).toBe(true);
    });

    it("returns false when globals.stateVersion is StateVersion.Five (Latest)", async () => {
      storage.store.set("global", { stateVersion: StateVersion.Five });

      expect(await svc.needsMigration()).toBe(false);
    });

    it("returns true when globals exists but has no stateVersion (defaults to StateVersion.One)", async () => {
      storage.store.set("global", { window: { width: 1024 } });

      expect(await svc.needsMigration()).toBe(true);
    });
  });

  describe("migrate()", () => {
    it("throws when stateVersion is below StateVersion.Four (MinSupportedStateVersion)", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Three);

      await expect(svc.migrate()).rejects.toThrow(
        "Your Directory Connector data is too old to migrate",
      );
    });

    it("runs migrateStateFrom4To5 when stateVersion is StateVersion.Four", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Four);

      await svc.migrate();

      expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Five);
    });

    it("does nothing (no extra writes) when stateVersion is already StateVersion.Five", async () => {
      storage.store.set(StorageKeys.stateVersion, StateVersion.Five);
      const storeSnapshot = new Map(storage.store);

      await svc.migrate();

      expect(storage.store).toEqual(storeSnapshot);
    });
  });

  describe("migrateStateFrom4To5()", () => {
    describe("no account (null activeUserId)", () => {
      it("writes only stateVersion = Five, no other keys", async () => {
        // Seed stateVersion = Four, but no activeUserId and no account data
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);

        await svc.migrate();

        expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Five);
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
          apiKeyClientId: "organization.client-id",
          apiKeyClientSecret: "client-secret",
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
          settings: { environmentUrls: { base: "https://vault.example.com" } },
        });
        storage.store.set("global", {
          window: { width: 1024, height: 768 },
          enableAlwaysOnTop: false,
          enableTray: true,
          enableMinimizeToTray: true,
          enableCloseToTray: false,
          alwaysShowDock: true,
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

      it("migrates sync metadata (stored via SecureStorageKeys as key names)", async () => {
        await svc.migrate();

        // These are written via this.set() → regular storageService, using the SecureStorageKeys value as the key string
        expect(storage.store.get(SecureStorageKeys.lastUserSync)).toBe("2024-01-01T00:00:00.000Z");
        expect(storage.store.get(SecureStorageKeys.lastGroupSync)).toBe("2024-06-15T12:00:00.000Z");
        expect(storage.store.get(StorageKeys.lastSyncHash)).toBe("hash-abc");
        expect(storage.store.get(SecureStorageKeys.userDelta)).toBe("user-delta-token");
        expect(storage.store.get(SecureStorageKeys.groupDelta)).toBe("group-delta-token");
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

      it("migrates old {userId}_* secure storage keys to flat keys", async () => {
        await svc.migrate();

        // New flat keys present
        expect(secureStorage.store.get(SecureStorageKeys.ldap)).toBe("ldap-pass");
        expect(secureStorage.store.get(SecureStorageKeys.gsuite)).toBe("gsuite-key");
        expect(secureStorage.store.get(SecureStorageKeys.entra)).toBe("entra-key");
        expect(secureStorage.store.get(SecureStorageKeys.azure)).toBe("azure-key");
        expect(secureStorage.store.get(SecureStorageKeys.okta)).toBe("okta-token");
        expect(secureStorage.store.get(SecureStorageKeys.oneLogin)).toBe("onelogin-secret");
        expect(secureStorage.store.get(SecureStorageKeys.accessToken)).toBe("access-tok");
        expect(secureStorage.store.get(SecureStorageKeys.refreshToken)).toBe("refresh-tok");
        expect(secureStorage.store.get(SecureStorageKeys.twoFactorToken)).toBe("2fa-tok");

        // Old prefixed keys intentionally kept — will be removed in a future migration
        expect(secureStorage.store.has(`${userId}_ldapPassword`)).toBe(true);
        expect(secureStorage.store.has(`${userId}_accessToken`)).toBe(true);
      });

      it("migrates apiKeyClientId and apiKeyClientSecret from account to secure storage", async () => {
        await svc.migrate();

        expect(secureStorage.store.get(SecureStorageKeys.apiKeyClientId)).toBe(
          "organization.client-id",
        );
        expect(secureStorage.store.get(SecureStorageKeys.apiKeyClientSecret)).toBe("client-secret");
      });

      it("sets stateVersion to StateVersion.Five", async () => {
        await svc.migrate();

        expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Five);
      });
    });

    describe("GSuite privateKey embedded in config object", () => {
      it("extracts privateKey from gsuite config into secure storage and replaces with StoredSecurely", async () => {
        const userId = "user-gsuite-key";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          directoryConfigurations: {
            gsuite: {
              domain: "example.com",
              clientEmail: "sa@example.com",
              privateKey: "-----BEGIN RSA PRIVATE KEY-----\nMIIEo...",
            },
          },
          directorySettings: {},
          settings: {},
        });

        await svc.migrate();

        expect(secureStorage.store.get(SecureStorageKeys.gsuite)).toBe(
          "-----BEGIN RSA PRIVATE KEY-----\nMIIEo...",
        );
        const gsuiteConfig = storage.store.get(StorageKeys.directoryGsuite) as any;
        expect(gsuiteConfig.privateKey).toBe("[STORED SECURELY]");
        expect(gsuiteConfig.domain).toBe("example.com");
      });
    });

    describe("Entra key embedded in config object", () => {
      it("extracts key from entra config into secure storage and replaces with StoredSecurely", async () => {
        const userId = "user-entra-key";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          directoryConfigurations: {
            entra: { tenant: "my-tenant", applicationId: "app-id", key: "entra-secret-key" },
          },
          directorySettings: {},
          settings: {},
        });

        await svc.migrate();

        expect(secureStorage.store.get(SecureStorageKeys.entra)).toBe("entra-secret-key");
        const entraConfig = storage.store.get(StorageKeys.directoryEntra) as any;
        expect(entraConfig.key).toBe("[STORED SECURELY]");
        expect(entraConfig.tenant).toBe("my-tenant");
      });

      it("extracts key from azure fallback config into secure storage", async () => {
        const userId = "user-azure-key";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          directoryConfigurations: {
            azure: { tenant: "azure-tenant", applicationId: "azure-app", key: "azure-secret-key" },
          },
          directorySettings: {},
          settings: {},
        });

        await svc.migrate();

        expect(secureStorage.store.get(SecureStorageKeys.entra)).toBe("azure-secret-key");
        const entraConfig = storage.store.get(StorageKeys.directoryEntra) as any;
        expect(entraConfig.key).toBe("[STORED SECURELY]");
      });
    });

    describe("Okta token embedded in config object", () => {
      it("extracts token from okta config into secure storage and replaces with StoredSecurely", async () => {
        const userId = "user-okta-token";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          directoryConfigurations: {
            okta: { orgUrl: "https://example.okta.com", token: "okta-api-token" },
          },
          directorySettings: {},
          settings: {},
        });

        await svc.migrate();

        expect(secureStorage.store.get(SecureStorageKeys.okta)).toBe("okta-api-token");
        const oktaConfig = storage.store.get(StorageKeys.directoryOkta) as any;
        expect(oktaConfig.token).toBe("[STORED SECURELY]");
        expect(oktaConfig.orgUrl).toBe("https://example.okta.com");
      });
    });

    describe("OneLogin clientSecret embedded in config object", () => {
      it("extracts clientSecret from oneLogin config into secure storage and replaces with StoredSecurely", async () => {
        const userId = "user-onelogin-secret";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          directoryConfigurations: {
            oneLogin: { clientId: "ol-client-id", clientSecret: "ol-client-secret", region: "us" },
          },
          directorySettings: {},
          settings: {},
        });

        await svc.migrate();

        expect(secureStorage.store.get(SecureStorageKeys.oneLogin)).toBe("ol-client-secret");
        const oneLoginConfig = storage.store.get(StorageKeys.directoryOnelogin) as any;
        expect(oneLoginConfig.clientSecret).toBe("[STORED SECURELY]");
        expect(oneLoginConfig.clientId).toBe("ol-client-id");
      });
    });

    describe("LDAP password embedded in config object", () => {
      it("extracts password from ldap config into secure storage and replaces with StoredSecurely", async () => {
        const userId = "user-ldap-pass";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          directoryConfigurations: {
            ldap: { hostname: "ldap.example.com", port: 389, password: "super-secret" },
          },
          directorySettings: {},
          settings: {},
        });

        await svc.migrate();

        expect(secureStorage.store.get(SecureStorageKeys.ldap)).toBe("super-secret");
        const ldapConfig = storage.store.get(StorageKeys.directoryLdap) as any;
        expect(ldapConfig.password).toBe("[STORED SECURELY]");
        expect(ldapConfig.hostname).toBe("ldap.example.com");
      });

      it("does not overwrite an existing secure storage LDAP secret with StoredSecurely placeholder", async () => {
        const userId = "user-ldap-placeholder";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          directoryConfigurations: {
            ldap: { hostname: "ldap.example.com", password: "[STORED SECURELY]" },
          },
          directorySettings: {},
          settings: {},
        });
        secureStorage.store.set(`${userId}_ldapPassword`, "real-secret");

        await svc.migrate();

        // The prefixed key migration should have moved the real secret
        expect(secureStorage.store.get(SecureStorageKeys.ldap)).toBe("real-secret");
      });
    });

    describe("azure fallback (no entra, only azure in directoryConfigurations)", () => {
      it("populates directoryEntra from azure config when entra is absent", async () => {
        const userId = "user-abc-123";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
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
        expect(storage.store.get(StorageKeys.stateVersion)).toBe(StateVersion.Five);
      });
    });

    describe("useSecureStorageForSecrets = false", () => {
      it("does not migrate or remove {userId}_* secure storage keys", async () => {
        const userId = "user-abc-123";
        storage.store.set(StorageKeys.stateVersion, StateVersion.Four);
        storage.store.set("activeUserId", userId);
        storage.store.set(userId, {
          directorySettings: { organizationId: "org-789" },
        });
        secureStorage.store.set(`${userId}_accessToken`, "access-tok");
        secureStorage.store.set(`${userId}_ldapPassword`, "ldap-pass");

        // Access migrateStateFrom4To5 via a subclass to pass false
        class TestableService extends StateMigrationService {
          async runMigration(): Promise<void> {
            await this.migrateStateFrom4To5(false);
          }
        }
        const testSvc = new TestableService(storage, secureStorage);
        await testSvc.runMigration();

        // Old keys NOT removed
        expect(secureStorage.store.has(`${userId}_accessToken`)).toBe(true);
        expect(secureStorage.store.has(`${userId}_ldapPassword`)).toBe(true);
        // New flat keys NOT written
        expect(secureStorage.store.has(SecureStorageKeys.accessToken)).toBe(false);
        expect(secureStorage.store.has(SecureStorageKeys.ldap)).toBe(false);
      });
    });

    describe("getCurrentStateVersion() (tested indirectly via needsMigration)", () => {
      it("returns StateVersion.Latest (no migration needed) when both flat key and globals are absent (fresh install)", async () => {
        // Completely empty storage — treat as fresh install
        expect(await svc.needsMigration()).toBe(false);
      });

      it("prefers flat stateVersion key over globals.stateVersion", async () => {
        storage.store.set(StorageKeys.stateVersion, StateVersion.Five);
        storage.store.set("global", { stateVersion: StateVersion.Four });

        // Flat key wins → at latest → no migration needed
        expect(await svc.needsMigration()).toBe(false);
      });
    });
  });
});
