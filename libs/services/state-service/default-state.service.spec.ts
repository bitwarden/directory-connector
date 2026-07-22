import { LogService } from "@/libs/abstractions/log.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { EnvironmentUrls } from "@/libs/models/domain/environmentUrls";
import { EntraIdConfiguration } from "@/libs/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/libs/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/libs/models/ldapConfiguration";
import { OktaConfiguration } from "@/libs/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/libs/models/oneLoginConfiguration";
import { SecureStorageKeys, StorageKeys, StoredSecurely } from "@/libs/models/state.model";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

import { DefaultStateService } from "./default-state.service";
import { StateMigrationService } from "./stateMigration.service";

import { FakeStorageService } from "@/utils/fakeStorageService";

const noopLog: LogService = {
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  write: jest.fn(),
  time: jest.fn(),
  timeEnd: jest.fn(),
};

function makeMigrationService(needsMigration = false): StateMigrationService {
  return {
    needsMigration: jest.fn().mockResolvedValue(needsMigration),
    migrate: jest.fn().mockResolvedValue(undefined),
    stampVersion: jest.fn().mockResolvedValue(undefined),
  } as unknown as StateMigrationService;
}

/**
 * Secure storage keys are scoped by a randomly-generated `id` assigned to each configuration
 * (see secret-storage-key.util.ts), so tests look up the `id` that was actually persisted for a
 * given directory type rather than predicting it.
 */
function scopedSecretKey(legacyKey: string, storedConfig: { id?: string } | null | undefined) {
  return `${legacyKey}:${storedConfig?.id}`;
}

function makeStateService(
  storage: FakeStorageService,
  secureStorage: FakeStorageService,
  useSecureStorageForSecrets = true,
  migrationService?: StateMigrationService,
) {
  return new DefaultStateService(
    storage,
    secureStorage,
    noopLog,
    migrationService ?? makeMigrationService(),
    useSecureStorageForSecrets,
  );
}

const ldapConfig: LdapConfiguration = {
  ssl: true,
  startTls: false,
  tlsCaPath: null,
  sslAllowUnauthorized: false,
  sslCertPath: null,
  sslKeyPath: null,
  sslCaPath: null,
  hostname: "ldap.example.com",
  port: 636,
  domain: null,
  rootPath: null,
  ad: true,
  username: "admin",
  password: "secret-password",
  currentUser: false,
  pagedSearch: true,
};

describe("DefaultStateService", () => {
  let storage: FakeStorageService;
  let secureStorage: FakeStorageService;
  let stateService: DefaultStateService;

  beforeEach(() => {
    storage = new FakeStorageService();
    secureStorage = new FakeStorageService();
    stateService = makeStateService(storage, secureStorage);
  });

  describe("init", () => {
    it("runs migration when needed", async () => {
      const migrationService = makeMigrationService(true);
      const svc = makeStateService(storage, secureStorage, true, migrationService);

      await svc.init();

      expect(migrationService.needsMigration).toHaveBeenCalled();
      expect(migrationService.migrate).toHaveBeenCalled();
    });

    it("skips migration when not needed", async () => {
      const migrationService = makeMigrationService(false);
      const svc = makeStateService(storage, secureStorage, true, migrationService);

      await svc.init();

      expect(migrationService.needsMigration).toHaveBeenCalled();
      expect(migrationService.migrate).not.toHaveBeenCalled();
    });

    it("always calls stampVersion regardless of whether migration ran", async () => {
      for (const needed of [true, false]) {
        const migrationService = makeMigrationService(needed);
        const svc = makeStateService(storage, secureStorage, true, migrationService);

        await svc.init();

        expect(migrationService.stampVersion).toHaveBeenCalled();
      }
    });
  });

  describe("Directory Type", () => {
    it("round-trips the directory type", async () => {
      await stateService.setDirectoryType(DirectoryType.Ldap);

      expect(await stateService.getDirectoryType()).toBe(DirectoryType.Ldap);
    });

    it("returns null when not set", async () => {
      expect(await stateService.getDirectoryType()).toBeNull();
    });

    it("stores value in regular storage, not secure storage", async () => {
      await stateService.setDirectoryType(DirectoryType.Okta);

      expect(storage.store.get(StorageKeys.directoryType)).toBe(DirectoryType.Okta);
      expect(secureStorage.store.size).toBe(0);
    });
  });

  describe("Organization ID", () => {
    it("stores and retrieves the organization ID", async () => {
      await stateService.setOrganizationId("test-org-123");

      expect(await stateService.getOrganizationId()).toBe("test-org-123");
    });
  });

  describe("LDAP Configuration", () => {
    it("round-trips LDAP config; secret is in secure storage, not regular storage", async () => {
      await stateService.setDirectory(DirectoryType.Ldap, { ...ldapConfig });
      const result = await stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);

      expect(result.password).toBe("secret-password");
      // Regular storage must not contain the plaintext password
      const stored = storage.store.get(StorageKeys.directoryLdap) as LdapConfiguration;
      expect(stored.password).toBe(StoredSecurely);
      // The saved config is assigned a unique id, and secure storage holds the real password
      // scoped to that id (rather than a single flat key shared by every configuration).
      expect(stored.id).toBeTruthy();
      expect(secureStorage.store.get(scopedSecretKey(SecureStorageKeys.ldap, stored))).toBe(
        "secret-password",
      );
    });

    it("returns null when LDAP configuration is not set", async () => {
      expect(await stateService.getLdapConfiguration()).toBeNull();
    });

    it("removes secret from secure storage when password is null", async () => {
      // First set a password, then clear it
      await stateService.setDirectory(DirectoryType.Ldap, { ...ldapConfig });
      const stored = storage.store.get(StorageKeys.directoryLdap) as LdapConfiguration;
      await stateService.setDirectory(DirectoryType.Ldap, { ...ldapConfig, password: null });

      expect(secureStorage.store.has(scopedSecretKey(SecureStorageKeys.ldap, stored))).toBe(false);
      expect(secureStorage.store.has(SecureStorageKeys.ldap)).toBe(false);
    });

    it("keeps secrets for two different LDAP configs (e.g. two AD service accounts) isolated", async () => {
      const account1 = { ...ldapConfig, username: "account1", password: "password-one" };
      const account2 = { ...ldapConfig, username: "account2", password: "password-two" };

      // Configure and save account 1, then swap in account 2's config (simulating
      // copying a different data.json in as described in the multi-directory workflow).
      await stateService.setDirectory(DirectoryType.Ldap, { ...account1 });
      const savedAccount1Snapshot = {
        ...(storage.store.get(StorageKeys.directoryLdap) as LdapConfiguration),
      };

      await stateService.setDirectory(DirectoryType.Ldap, { ...account2 });
      const savedAccount2 = storage.store.get(StorageKeys.directoryLdap) as LdapConfiguration;

      // The two configurations must have been assigned different ids.
      expect(savedAccount1Snapshot.id).not.toBe(savedAccount2.id);

      // Restoring account 1's (non-secret) config from an earlier data.json backup...
      storage.store.set(StorageKeys.directoryLdap, savedAccount1Snapshot);

      // ...must resolve back to account 1's password, not account 2's - even though account 2's
      // secret was saved more recently on this machine.
      const result = await stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);
      expect(result.username).toBe("account1");
      expect(result.password).toBe("password-one");
    });

    it("keeps the same id (and secure-storage slot) when re-saving the same account, e.g. a password rotation", async () => {
      await stateService.setDirectory(DirectoryType.Ldap, {
        ...ldapConfig,
        password: "password-one",
      });
      const firstSave = storage.store.get(StorageKeys.directoryLdap) as LdapConfiguration;

      // Same hostname/domain/username, only the password changes.
      await stateService.setDirectory(DirectoryType.Ldap, {
        ...ldapConfig,
        password: "password-two",
      });
      const secondSave = storage.store.get(StorageKeys.directoryLdap) as LdapConfiguration;

      expect(secondSave.id).toBe(firstSave.id);
      const result = await stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);
      expect(result.password).toBe("password-two");
    });

    it("falls back to the legacy unscoped key for installs upgrading from a single shared secret", async () => {
      // Simulate a pre-fix install: config stored with StoredSecurely (and no `id`), secret
      // under the old flat key.
      storage.store.set(StorageKeys.directoryLdap, { ...ldapConfig, password: StoredSecurely });
      secureStorage.store.set(SecureStorageKeys.ldap, "legacy-password");

      const result = await stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);

      expect(result.password).toBe("legacy-password");
    });

    it("migrates a legacy (pre-fix) config to a scoped id on next save, without disturbing the legacy secret still relied on by other not-yet-migrated data.json copies", async () => {
      // Simulate an install from before this fix: config with no `id`, secret in the legacy flat
      // key - as if account 1 had been configured on a version of the app before this change.
      storage.store.set(StorageKeys.directoryLdap, { ...ldapConfig, password: StoredSecurely });
      secureStorage.store.set(SecureStorageKeys.ldap, "legacy-password-account1");

      // A backup copy of that legacy data.json (e.g. taken before configuring account 2 below).
      const legacyAccount1Snapshot = {
        ...(storage.store.get(StorageKeys.directoryLdap) as LdapConfiguration),
      };

      // The customer upgrades and configures a second account (same running app/data.json).
      await stateService.setDirectory(DirectoryType.Ldap, {
        ...ldapConfig,
        username: "account2",
        password: "password-two",
      });
      const savedAccount2 = storage.store.get(StorageKeys.directoryLdap) as LdapConfiguration;
      expect(savedAccount2.id).toBeTruthy();

      // The legacy flat secret must be untouched - it still holds account 1's password.
      expect(secureStorage.store.get(SecureStorageKeys.ldap)).toBe("legacy-password-account1");

      // Restoring the pre-fix account 1 backup (still without an `id`) must still resolve to
      // account 1's password via the legacy fallback, even though account 2 was configured since.
      storage.store.set(StorageKeys.directoryLdap, legacyAccount1Snapshot);
      const result = await stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);
      expect(result.username).toBe(ldapConfig.username);
      expect(result.password).toBe("legacy-password-account1");
    });
  });

  // -------------------------------------------------------------------------

  describe("GSuite Configuration", () => {
    const gsuiteConfig: GSuiteConfiguration = {
      domain: "example.com",
      clientEmail: "service@example.com",
      adminUser: "admin@example.com",
      privateKey: "private-key-content",
      customer: "customer-id",
    };

    it("round-trips GSuite config; privateKey is in secure storage, not regular storage", async () => {
      await stateService.setDirectory(DirectoryType.GSuite, { ...gsuiteConfig });
      const result = await stateService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite);

      expect(result.privateKey).toBe("private-key-content");
      const stored = storage.store.get(StorageKeys.directoryGsuite) as GSuiteConfiguration;
      expect(stored.privateKey).toBe(StoredSecurely);
      expect(stored.id).toBeTruthy();
      expect(secureStorage.store.get(scopedSecretKey(SecureStorageKeys.gsuite, stored))).toBe(
        "private-key-content",
      );
    });

    it("normalizes escaped newlines in privateKey", async () => {
      const keyWithEscapedNewlines = "line1\\nline2\\nline3";
      await stateService.setDirectory(DirectoryType.GSuite, {
        ...gsuiteConfig,
        privateKey: keyWithEscapedNewlines,
      });
      const stored = storage.store.get(StorageKeys.directoryGsuite) as GSuiteConfiguration;

      expect(secureStorage.store.get(scopedSecretKey(SecureStorageKeys.gsuite, stored))).toBe(
        "line1\nline2\nline3",
      );
    });

    it("removes secret from secure storage when privateKey is null", async () => {
      await stateService.setDirectory(DirectoryType.GSuite, { ...gsuiteConfig });
      const stored = storage.store.get(StorageKeys.directoryGsuite) as GSuiteConfiguration;
      await stateService.setDirectory(DirectoryType.GSuite, { ...gsuiteConfig, privateKey: null });

      expect(secureStorage.store.has(scopedSecretKey(SecureStorageKeys.gsuite, stored))).toBe(
        false,
      );
      expect(secureStorage.store.has(SecureStorageKeys.gsuite)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------

  describe("Entra ID Configuration", () => {
    const entraConfig: EntraIdConfiguration = {
      identityAuthority: "https://login.microsoftonline.com",
      tenant: "tenant-id",
      applicationId: "app-id",
      key: "secret-key",
    };

    it("round-trips Entra ID config; key is in secure storage, not regular storage", async () => {
      await stateService.setDirectory(DirectoryType.EntraID, { ...entraConfig });
      const result = await stateService.getDirectory<EntraIdConfiguration>(DirectoryType.EntraID);

      expect(result.key).toBe("secret-key");
      const stored = storage.store.get(StorageKeys.directoryEntra) as EntraIdConfiguration;
      expect(stored.key).toBe(StoredSecurely);
      expect(stored.id).toBeTruthy();
      expect(secureStorage.store.get(scopedSecretKey(SecureStorageKeys.entra, stored))).toBe(
        "secret-key",
      );
    });

    it("falls back to legacy azure key when entra key is absent", async () => {
      // Simulate a legacy record: config stored with StoredSecurely, azure key present
      storage.store.set(StorageKeys.directoryEntra, { ...entraConfig, key: StoredSecurely });
      secureStorage.store.set(SecureStorageKeys.azure, "azure-secret-key");
      // entra key is absent

      const result = await stateService.getDirectory<EntraIdConfiguration>(DirectoryType.EntraID);

      expect(result.key).toBe("azure-secret-key");
    });

    it("clears both entra and azure keys from secure storage when key is null", async () => {
      secureStorage.store.set(SecureStorageKeys.entra, "entra-key");
      secureStorage.store.set(SecureStorageKeys.azure, "azure-key");

      await stateService.setDirectory(DirectoryType.EntraID, { ...entraConfig, key: null });

      expect(secureStorage.store.has(SecureStorageKeys.entra)).toBe(false);
      expect(secureStorage.store.has(SecureStorageKeys.azure)).toBe(false);
    });

    it("keeps secrets for two different Entra configs (e.g. two tenants) isolated", async () => {
      const tenant1 = { ...entraConfig, tenant: "tenant-one", key: "key-one" };
      const tenant2 = { ...entraConfig, tenant: "tenant-two", key: "key-two" };

      await stateService.setDirectory(DirectoryType.EntraID, { ...tenant1 });
      const savedTenant1Snapshot = {
        ...(storage.store.get(StorageKeys.directoryEntra) as EntraIdConfiguration),
      };

      await stateService.setDirectory(DirectoryType.EntraID, { ...tenant2 });
      const savedTenant2 = storage.store.get(StorageKeys.directoryEntra) as EntraIdConfiguration;
      expect(savedTenant1Snapshot.id).not.toBe(savedTenant2.id);

      // Restoring tenant 1's (non-secret) config from an earlier data.json backup...
      storage.store.set(StorageKeys.directoryEntra, savedTenant1Snapshot);

      const result = await stateService.getDirectory<EntraIdConfiguration>(DirectoryType.EntraID);
      expect(result.tenant).toBe("tenant-one");
      expect(result.key).toBe("key-one");
    });
  });

  // -------------------------------------------------------------------------

  describe("Okta Configuration", () => {
    const oktaConfig: OktaConfiguration = {
      orgUrl: "https://example.okta.com",
      token: "okta-token",
    };

    it("round-trips Okta config; token is in secure storage, not regular storage", async () => {
      await stateService.setDirectory(DirectoryType.Okta, { ...oktaConfig });
      const result = await stateService.getDirectory<OktaConfiguration>(DirectoryType.Okta);

      expect(result.token).toBe("okta-token");
      const stored = storage.store.get(StorageKeys.directoryOkta) as OktaConfiguration;
      expect(stored.token).toBe(StoredSecurely);
      expect(stored.id).toBeTruthy();
      expect(secureStorage.store.get(scopedSecretKey(SecureStorageKeys.okta, stored))).toBe(
        "okta-token",
      );
    });
  });

  // -------------------------------------------------------------------------

  describe("OneLogin Configuration", () => {
    const oneLoginConfig: OneLoginConfiguration = {
      region: "us",
      clientId: "client-id",
      clientSecret: "client-secret",
    };

    it("round-trips OneLogin config; clientSecret is in secure storage, not regular storage", async () => {
      await stateService.setDirectory(DirectoryType.OneLogin, { ...oneLoginConfig });
      const result = await stateService.getDirectory<OneLoginConfiguration>(DirectoryType.OneLogin);

      expect(result.clientSecret).toBe("client-secret");
      const stored = storage.store.get(StorageKeys.directoryOnelogin) as OneLoginConfiguration;
      expect(stored.clientSecret).toBe(StoredSecurely);
      expect(stored.id).toBeTruthy();
      expect(secureStorage.store.get(scopedSecretKey(SecureStorageKeys.oneLogin, stored))).toBe(
        "client-secret",
      );
    });
  });

  // -------------------------------------------------------------------------

  describe("Secure Storage Flag (useSecureStorageForSecrets = false)", () => {
    it("stores secrets in regular storage when secure storage is disabled", async () => {
      const insecureSvc = makeStateService(storage, secureStorage, false);

      await insecureSvc.setDirectory(DirectoryType.Ldap, { ...ldapConfig });
      const result = await insecureSvc.getDirectory<LdapConfiguration>(DirectoryType.Ldap);

      // With useSecureStorageForSecrets=false the config is stored as-is and
      // returned directly — no secure storage round-trip.
      expect(result?.password).toBe("secret-password");
      // Secure storage should not have been used for directory secrets
      expect(secureStorage.store.has(SecureStorageKeys.ldap)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------

  describe("Sync Configuration", () => {
    const syncConfig: SyncConfiguration = {
      users: true,
      groups: true,
      interval: 5,
      userFilter: null,
      groupFilter: null,
      removeDisabled: true,
      overwriteExisting: false,
      largeImport: false,
      groupObjectClass: null,
      userObjectClass: null,
      groupPath: null,
      userPath: null,
      groupNameAttribute: null,
      userEmailAttribute: null,
      memberAttribute: "member",
      creationDateAttribute: "whenCreated",
      revisionDateAttribute: "whenChanged",
      useEmailPrefixSuffix: false,
      emailPrefixAttribute: null,
      emailSuffix: null,
    };

    it("round-trips sync configuration", async () => {
      await stateService.setSync(syncConfig);

      expect(await stateService.getSync()).toEqual(syncConfig);
    });

    it("stores in regular storage, not secure storage", async () => {
      await stateService.setSync(syncConfig);

      expect(storage.store.get(StorageKeys.sync)).toEqual(syncConfig);
      expect(secureStorage.store.size).toBe(0);
    });
  });

  // -------------------------------------------------------------------------

  describe("clearSyncSettings", () => {
    beforeEach(async () => {
      await stateService.setUserDelta("user-delta");
      await stateService.setGroupDelta("group-delta");
      await stateService.setLastUserSync(new Date("2024-01-01"));
      await stateService.setLastGroupSync(new Date("2024-01-01"));
      await stateService.setLastSyncHash("hash-abc");
    });

    it("clears deltas and last sync timestamps but preserves hash by default", async () => {
      await stateService.clearSyncSettings(false);

      expect(await stateService.getUserDelta()).toBeNull();
      expect(await stateService.getGroupDelta()).toBeNull();
      expect(await stateService.getLastUserSync()).toBeNull();
      expect(await stateService.getLastGroupSync()).toBeNull();
      // hash preserved
      expect(await stateService.getLastSyncHash()).toBe("hash-abc");
    });

    it("also clears hash when hashToo is true", async () => {
      await stateService.clearSyncSettings(true);

      expect(await stateService.getLastSyncHash()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------

  describe("Last Sync Hash", () => {
    it("round-trips last sync hash", async () => {
      await stateService.setLastSyncHash("hash-abc");

      expect(await stateService.getLastSyncHash()).toBe("hash-abc");
    });
  });

  // -------------------------------------------------------------------------

  describe("Delta Tokens", () => {
    it("round-trips user delta token", async () => {
      await stateService.setUserDelta("user-delta-token");

      expect(await stateService.getUserDelta()).toBe("user-delta-token");
    });

    it("round-trips group delta token", async () => {
      await stateService.setGroupDelta("group-delta-token");

      expect(await stateService.getGroupDelta()).toBe("group-delta-token");
    });
  });

  // -------------------------------------------------------------------------

  describe("Last Sync Timestamps", () => {
    it("round-trips last user sync timestamp", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");
      await stateService.setLastUserSync(timestamp);

      expect((await stateService.getLastUserSync()).toISOString()).toBe(timestamp.toISOString());
    });

    it("round-trips last group sync timestamp", async () => {
      const timestamp = new Date("2024-06-15T12:00:00Z");
      await stateService.setLastGroupSync(timestamp);

      expect((await stateService.getLastGroupSync()).toISOString()).toBe(timestamp.toISOString());
    });

    it("returns null when last user sync is not set", async () => {
      expect(await stateService.getLastUserSync()).toBeNull();
    });

    it("returns null when last group sync is not set", async () => {
      expect(await stateService.getLastGroupSync()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------

  describe("Window Settings", () => {
    it("round-trips window state", async () => {
      const windowState = { width: 1024, height: 768, x: 100, y: 100, isMaximized: false };
      await stateService.setWindow(windowState);

      expect(await stateService.getWindow()).toEqual(windowState);
    });

    it("returns null when window state is not set", async () => {
      expect(await stateService.getWindow()).toBeNull();
    });

    it("stores in regular storage, not secure storage", async () => {
      const windowState = { width: 800, height: 600 };
      await stateService.setWindow(windowState);

      expect(storage.store.get(StorageKeys.window)).toEqual(windowState);
      expect(secureStorage.store.size).toBe(0);
    });

    it("round-trips enableAlwaysOnTop", async () => {
      await stateService.setEnableAlwaysOnTop(true);

      expect(await stateService.getEnableAlwaysOnTop()).toBe(true);
    });

    it("defaults enableAlwaysOnTop to false when not set", async () => {
      expect(await stateService.getEnableAlwaysOnTop()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------

  describe("Tray Settings", () => {
    it("round-trips enableTray", async () => {
      await stateService.setEnableTray(true);

      expect(await stateService.getEnableTray()).toBe(true);
    });

    it("defaults enableTray to false when not set", async () => {
      expect(await stateService.getEnableTray()).toBe(false);
    });

    it("round-trips enableMinimizeToTray", async () => {
      await stateService.setEnableMinimizeToTray(true);

      expect(await stateService.getEnableMinimizeToTray()).toBe(true);
    });

    it("defaults enableMinimizeToTray to false when not set", async () => {
      expect(await stateService.getEnableMinimizeToTray()).toBe(false);
    });

    it("round-trips enableCloseToTray", async () => {
      await stateService.setEnableCloseToTray(true);

      expect(await stateService.getEnableCloseToTray()).toBe(true);
    });

    it("defaults enableCloseToTray to false when not set", async () => {
      expect(await stateService.getEnableCloseToTray()).toBe(false);
    });

    it("round-trips alwaysShowDock", async () => {
      await stateService.setAlwaysShowDock(true);

      expect(await stateService.getAlwaysShowDock()).toBe(true);
    });

    it("defaults alwaysShowDock to false when not set", async () => {
      expect(await stateService.getAlwaysShowDock()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------

  describe("Environment URLs", () => {
    const urls: EnvironmentUrls = {
      base: "https://vault.example.com",
      api: "https://api.example.com",
      identity: "https://identity.example.com",
      webVault: "https://vault.example.com",
    };

    it("round-trips environment URLs", async () => {
      await stateService.setEnvironmentUrls(urls);

      expect(await stateService.getEnvironmentUrls()).toEqual(urls);
    });

    it("returns null when environment URLs are not set", async () => {
      expect(await stateService.getEnvironmentUrls()).toBeNull();
    });

    it("returns explicit api URL", async () => {
      await stateService.setEnvironmentUrls({ ...urls, base: null });

      expect(await stateService.getApiUrl()).toBe("https://api.example.com");
    });

    it("derives API URL from base when api is not set", async () => {
      await stateService.setEnvironmentUrls({
        base: "https://vault.example.com",
        api: null,
        identity: null,
        webVault: null,
      });

      expect(await stateService.getApiUrl()).toBe("https://vault.example.com/api");
    });

    it("returns default API URL when no URLs are set", async () => {
      expect(await stateService.getApiUrl()).toBe("https://api.bitwarden.com");
    });

    it("returns explicit identity URL", async () => {
      await stateService.setEnvironmentUrls({ ...urls, base: null });

      expect(await stateService.getIdentityUrl()).toBe("https://identity.example.com");
    });

    it("derives identity URL from base when identity is not set", async () => {
      await stateService.setEnvironmentUrls({
        base: "https://vault.example.com",
        api: null,
        identity: null,
        webVault: null,
      });

      expect(await stateService.getIdentityUrl()).toBe("https://vault.example.com/identity");
    });

    it("returns default identity URL when no URLs are set", async () => {
      expect(await stateService.getIdentityUrl()).toBe("https://identity.bitwarden.com");
    });

    it("stores in regular storage, not secure storage", async () => {
      await stateService.setEnvironmentUrls(urls);

      expect(storage.store.get(StorageKeys.environmentUrls)).toEqual(urls);
      expect(secureStorage.store.size).toBe(0);
    });
  });

  // -------------------------------------------------------------------------

  describe("Token Management", () => {
    describe("clearAuthTokens", () => {
      it("removes all five auth token types from secure storage", async () => {
        await stateService.setAccessToken("access");
        await stateService.setRefreshToken("refresh");
        await stateService.setApiKeyClientId("client-id");
        await stateService.setApiKeyClientSecret("client-secret");
        secureStorage.store.set(SecureStorageKeys.twoFactorToken, "2fa");

        await stateService.clearAuthTokens();

        expect(secureStorage.store.has(SecureStorageKeys.accessToken)).toBe(false);
        expect(secureStorage.store.has(SecureStorageKeys.refreshToken)).toBe(false);
        expect(secureStorage.store.has(SecureStorageKeys.apiKeyClientId)).toBe(false);
        expect(secureStorage.store.has(SecureStorageKeys.apiKeyClientSecret)).toBe(false);
        expect(secureStorage.store.has(SecureStorageKeys.twoFactorToken)).toBe(false);
      });

      it("does not touch regular storage when clearing auth tokens", async () => {
        await stateService.setOrganizationId("org-123");

        await stateService.clearAuthTokens();

        expect(storage.store.get(StorageKeys.organizationId)).toBe("org-123");
      });
    });

    describe("Access Token", () => {
      it("round-trips access token through secure storage", async () => {
        await stateService.setAccessToken("test-access-token");

        expect(await stateService.getAccessToken()).toBe("test-access-token");
        expect(secureStorage.store.get(SecureStorageKeys.accessToken)).toBe("test-access-token");
        expect(storage.store.has(SecureStorageKeys.accessToken)).toBe(false);
      });

      it("removes access token from secure storage when set to null", async () => {
        await stateService.setAccessToken("test-access-token");
        await stateService.setAccessToken(null);

        expect(await stateService.getAccessToken()).toBeNull();
        expect(secureStorage.store.has(SecureStorageKeys.accessToken)).toBe(false);
      });
    });

    describe("Refresh Token", () => {
      it("round-trips refresh token through secure storage", async () => {
        await stateService.setRefreshToken("test-refresh-token");

        expect(await stateService.getRefreshToken()).toBe("test-refresh-token");
        expect(secureStorage.store.get(SecureStorageKeys.refreshToken)).toBe("test-refresh-token");
        expect(storage.store.has(SecureStorageKeys.refreshToken)).toBe(false);
      });

      it("removes refresh token from secure storage when set to null", async () => {
        await stateService.setRefreshToken("test-refresh-token");
        await stateService.setRefreshToken(null);

        expect(await stateService.getRefreshToken()).toBeNull();
      });
    });

    describe("API Key Client ID", () => {
      it("round-trips API key client ID through secure storage", async () => {
        await stateService.setApiKeyClientId("organization.test-id");

        expect(await stateService.getApiKeyClientId()).toBe("organization.test-id");
        expect(secureStorage.store.get(SecureStorageKeys.apiKeyClientId)).toBe(
          "organization.test-id",
        );
        expect(storage.store.has(SecureStorageKeys.apiKeyClientId)).toBe(false);
      });

      it("removes client ID from secure storage when set to null", async () => {
        await stateService.setApiKeyClientId("organization.test-id");
        await stateService.setApiKeyClientId(null);

        expect(await stateService.getApiKeyClientId()).toBeNull();
      });
    });

    describe("API Key Client Secret", () => {
      it("round-trips API key client secret through secure storage", async () => {
        await stateService.setApiKeyClientSecret("test-secret");

        expect(await stateService.getApiKeyClientSecret()).toBe("test-secret");
        expect(secureStorage.store.get(SecureStorageKeys.apiKeyClientSecret)).toBe("test-secret");
        expect(storage.store.has(SecureStorageKeys.apiKeyClientSecret)).toBe(false);
      });

      it("removes client secret from secure storage when set to null", async () => {
        await stateService.setApiKeyClientSecret("test-secret");
        await stateService.setApiKeyClientSecret(null);

        expect(await stateService.getApiKeyClientSecret()).toBeNull();
      });
    });

    describe("Entity ID", () => {
      it("round-trips entity ID through regular storage", async () => {
        await stateService.setEntityId("test-entity-id");

        expect(await stateService.getEntityId()).toBe("test-entity-id");
        expect(storage.store.get(StorageKeys.entityId)).toBe("test-entity-id");
        expect(secureStorage.store.has(StorageKeys.entityId)).toBe(false);
      });

      it("removes entity ID from regular storage when set to null", async () => {
        await stateService.setEntityId("test-entity-id");
        await stateService.setEntityId(null);

        expect(await stateService.getEntityId()).toBeNull();
        expect(storage.store.has(StorageKeys.entityId)).toBe(false);
      });
    });

    describe("data reset detection", () => {
      it("returns no access token after clearAuthTokens is called", async () => {
        await stateService.setAccessToken("token");
        await stateService.clearAuthTokens();

        expect(await stateService.getAccessToken()).toBeNull();
      });

      it("returns null organization ID when storage is empty (simulating deleted data.json)", async () => {
        expect(await stateService.getOrganizationId()).toBeNull();
      });

      it("is not authenticated after clearAuthTokens removes the access token", async () => {
        await stateService.setAccessToken("token");
        await stateService.clearAuthTokens();

        expect(await stateService.getIsAuthenticated()).toBe(false);
      });
    });
  });
});
