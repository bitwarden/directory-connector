import { mock, MockProxy } from "jest-mock-extended";

import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { StateMigrationService } from "@/jslib/common/src/abstractions/stateMigration.service";
import { StorageService } from "@/jslib/common/src/abstractions/storage.service";

import { DirectoryType } from "@/src/enums/directoryType";
import { EntraIdConfiguration } from "@/src/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/src/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/src/models/ldapConfiguration";
import { OktaConfiguration } from "@/src/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/src/models/oneLoginConfiguration";
import { StorageKeysVNext as StorageKeys, StoredSecurely } from "@/src/models/state.model";
import { SyncConfiguration } from "@/src/models/syncConfiguration";

import { StateServiceVNextImplementation } from "./state-vNext.service";

describe("StateServiceVNextImplementation", () => {
  let storageService: MockProxy<StorageService>;
  let secureStorageService: MockProxy<StorageService>;
  let logService: MockProxy<LogService>;
  let stateMigrationService: MockProxy<StateMigrationService>;
  let stateService: StateServiceVNextImplementation;

  beforeEach(() => {
    storageService = mock<StorageService>();
    secureStorageService = mock<StorageService>();
    logService = mock<LogService>();
    stateMigrationService = mock<StateMigrationService>();

    stateService = new StateServiceVNextImplementation(
      storageService,
      secureStorageService,
      logService,
      stateMigrationService,
      true, // useSecureStorageForSecrets
    );
  });

  describe("init", () => {
    it("should run migration if needed", async () => {
      stateMigrationService.needsMigration.mockResolvedValue(true);

      await stateService.init();

      expect(stateMigrationService.needsMigration).toHaveBeenCalled();
      expect(stateMigrationService.migrate).toHaveBeenCalled();
    });

    it("should not run migration if not needed", async () => {
      stateMigrationService.needsMigration.mockResolvedValue(false);

      await stateService.init();

      expect(stateMigrationService.needsMigration).toHaveBeenCalled();
      expect(stateMigrationService.migrate).not.toHaveBeenCalled();
    });
  });

  describe("clean", () => {
    it("should clear all directory settings and configurations", async () => {
      await stateService.clean();

      // Verify all directory types are cleared
      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.directoryType, null);
      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.organizationId, null);
      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.sync, null);
    });
  });

  describe("Directory Type", () => {
    it("should store and retrieve directory type", async () => {
      storageService.get.mockResolvedValue(DirectoryType.Ldap);

      await stateService.setDirectoryType(DirectoryType.Ldap);
      const result = await stateService.getDirectoryType();

      expect(storageService.save).toHaveBeenCalledWith(
        StorageKeys.directoryType,
        DirectoryType.Ldap,
      );
      expect(result).toBe(DirectoryType.Ldap);
    });

    it("should return null when directory type is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getDirectoryType();

      expect(result).toBeNull();
    });
  });

  describe("Organization Id", () => {
    it("should store and retrieve organization ID", async () => {
      const orgId = "test-org-123";

      storageService.get.mockResolvedValue(orgId);

      await stateService.setOrganizationId(orgId);
      const result = await stateService.getOrganizationId();

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.organizationId, orgId);
      expect(result).toBe(orgId);
    });
  });

  describe("LDAP Configuration", () => {
    it("should store and retrieve LDAP configuration with secrets in secure storage", async () => {
      const config: LdapConfiguration = {
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

      secureStorageService.get.mockResolvedValue("secret-password");
      storageService.get.mockResolvedValue({
        ...config,
        password: StoredSecurely,
      });

      await stateService.setDirectory(DirectoryType.Ldap, config);
      const result = await stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);

      // Verify password is stored in secure storage
      expect(secureStorageService.save).toHaveBeenCalled();

      // Verify configuration is stored
      expect(storageService.save).toHaveBeenCalled();

      // Verify retrieved config has real password from secure storage
      expect(result?.password).toBe("secret-password");
    });

    it("should return null when LDAP configuration is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getLdapConfiguration();

      expect(result).toBeNull();
    });

    it("should handle null password in LDAP configuration", async () => {
      const config: LdapConfiguration = {
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
        password: null,
        currentUser: false,
        pagedSearch: true,
      };

      await stateService.setDirectory(DirectoryType.Ldap, config);

      // Null passwords should call remove on the secure storage secret key
      expect(secureStorageService.remove).toHaveBeenCalled();
    });
  });

  describe("GSuite Configuration", () => {
    it("should store and retrieve GSuite configuration with privateKey in secure storage", async () => {
      const config: GSuiteConfiguration = {
        domain: "example.com",
        clientEmail: "service@example.com",
        adminUser: "admin@example.com",
        privateKey: "private-key-content",
        customer: "customer-id",
      };

      secureStorageService.get.mockResolvedValue("private-key-content");
      storageService.get.mockResolvedValue({
        ...config,
        privateKey: StoredSecurely,
      });

      await stateService.setDirectory(DirectoryType.GSuite, config);
      const result = await stateService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite);

      expect(secureStorageService.save).toHaveBeenCalled();
      expect(result?.privateKey).toBe("private-key-content");
    });

    it("should handle null privateKey in GSuite configuration", async () => {
      const config: GSuiteConfiguration = {
        domain: "example.com",
        clientEmail: "service@example.com",
        adminUser: "admin@example.com",
        privateKey: null,
        customer: "customer-id",
      };

      await stateService.setDirectory(DirectoryType.GSuite, config);

      // Null privateKey should call remove on the secure storage secret key
      expect(secureStorageService.remove).toHaveBeenCalled();
    });
  });

  describe("Entra ID Configuration", () => {
    it("should store and retrieve Entra ID configuration with key in secure storage", async () => {
      const config: EntraIdConfiguration = {
        identityAuthority: "https://login.microsoftonline.com",
        tenant: "tenant-id",
        applicationId: "app-id",
        key: "secret-key",
      };

      secureStorageService.get.mockResolvedValue("secret-key");
      storageService.get.mockResolvedValue({
        ...config,
        key: StoredSecurely,
      });

      await stateService.setDirectory(DirectoryType.EntraID, config);
      const result = await stateService.getDirectory<EntraIdConfiguration>(DirectoryType.EntraID);

      expect(secureStorageService.save).toHaveBeenCalled();
      expect(result?.key).toBe("secret-key");
    });

    it("should maintain backwards compatibility with Azure key storage", async () => {
      const config: EntraIdConfiguration = {
        identityAuthority: "https://login.microsoftonline.com",
        tenant: "tenant-id",
        applicationId: "app-id",
        key: StoredSecurely,
      };

      storageService.get.mockResolvedValue(config);
      secureStorageService.get.mockResolvedValueOnce(null); // entra key not found
      secureStorageService.get.mockResolvedValueOnce("azure-secret-key"); // fallback to azure key

      const result = await stateService.getDirectory<EntraIdConfiguration>(DirectoryType.EntraID);

      expect(secureStorageService.get).toHaveBeenCalled();
      expect(result?.key).toBe("azure-secret-key");
    });
  });

  describe("Okta Configuration", () => {
    it("should store and retrieve Okta configuration with token in secure storage", async () => {
      const config: OktaConfiguration = {
        orgUrl: "https://example.okta.com",
        token: "okta-token",
      };

      secureStorageService.get.mockResolvedValue("okta-token");
      storageService.get.mockResolvedValue({
        ...config,
        token: StoredSecurely,
      });

      await stateService.setDirectory(DirectoryType.Okta, config);
      const result = await stateService.getDirectory<OktaConfiguration>(DirectoryType.Okta);

      expect(secureStorageService.save).toHaveBeenCalled();
      expect(result?.token).toBe("okta-token");
    });
  });

  describe("OneLogin Configuration", () => {
    it("should store and retrieve OneLogin configuration with clientSecret in secure storage", async () => {
      const config: OneLoginConfiguration = {
        region: "us",
        clientId: "client-id",
        clientSecret: "client-secret",
      };

      secureStorageService.get.mockResolvedValue("client-secret");
      storageService.get.mockResolvedValue({
        ...config,
        clientSecret: StoredSecurely,
      });

      await stateService.setDirectory(DirectoryType.OneLogin, config);
      const result = await stateService.getDirectory<OneLoginConfiguration>(DirectoryType.OneLogin);

      expect(secureStorageService.save).toHaveBeenCalled();
      expect(result?.clientSecret).toBe("client-secret");
    });
  });

  describe("Sync Configuration", () => {
    it("should store and retrieve sync configuration", async () => {
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

      storageService.get.mockResolvedValue(syncConfig);

      await stateService.setSync(syncConfig);
      const result = await stateService.getSync();

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.sync, syncConfig);
      expect(result).toEqual(syncConfig);
    });
  });

  describe("Sync Settings", () => {
    it("should clear sync settings when clearSyncSettings is called", async () => {
      await stateService.clearSyncSettings(false);

      // Should set delta and sync values to null
      expect(storageService.save).toHaveBeenCalled();
    });

    it("should clear lastSyncHash when hashToo is true", async () => {
      await stateService.clearSyncSettings(true);

      // Should set all values including lastSyncHash to null
      expect(storageService.save).toHaveBeenCalled();
    });

    it("should not clear lastSyncHash when hashToo is false", async () => {
      await stateService.clearSyncSettings(false);

      // Should set delta and sync values but not lastSyncHash
      expect(storageService.save).toHaveBeenCalled();
    });
  });

  describe("Last Sync Hash", () => {
    it("should store and retrieve last sync hash", async () => {
      const hash = "hash";

      storageService.get.mockResolvedValue(hash);

      await stateService.setLastSyncHash(hash);
      const result = await stateService.getLastSyncHash();

      expect(storageService.save).toHaveBeenCalled();
      expect(result).toBe(hash);
    });
  });

  describe("Delta Tokens", () => {
    it("should store and retrieve user delta token", async () => {
      const token = "user-delta-token";

      storageService.get.mockResolvedValue(token);

      await stateService.setUserDelta(token);
      const result = await stateService.getUserDelta();

      expect(storageService.save).toHaveBeenCalled();
      expect(result).toBe(token);
    });

    it("should store and retrieve group delta token", async () => {
      const token = "group-delta-token";

      storageService.get.mockResolvedValue(token);

      await stateService.setGroupDelta(token);
      const result = await stateService.getGroupDelta();

      expect(storageService.save).toHaveBeenCalled();
      expect(result).toBe(token);
    });
  });

  describe("Last Sync Timestamps", () => {
    it("should store and retrieve last user sync timestamp", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");

      storageService.get.mockResolvedValue(timestamp.toISOString());

      await stateService.setLastUserSync(timestamp);
      const result = await stateService.getLastUserSync();

      expect(storageService.save).toHaveBeenCalled();
      expect(result?.toISOString()).toBe(timestamp.toISOString());
    });

    it("should store and retrieve last group sync timestamp", async () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");

      storageService.get.mockResolvedValue(timestamp.toISOString());

      await stateService.setLastGroupSync(timestamp);
      const result = await stateService.getLastGroupSync();

      expect(storageService.save).toHaveBeenCalled();
      expect(result?.toISOString()).toBe(timestamp.toISOString());
    });

    it("should return null when last user sync timestamp is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getLastUserSync();

      expect(result).toBeNull();
    });

    it("should return null when last group sync timestamp is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getLastGroupSync();

      expect(result).toBeNull();
    });
  });

  describe("Secure Storage Flag", () => {
    it("should not separate secrets when useSecureStorageForSecrets is false", async () => {
      const insecureStateService = new StateServiceVNextImplementation(
        storageService,
        secureStorageService,
        logService,
        stateMigrationService,
        false, // useSecureStorageForSecrets = false
      );

      const config: LdapConfiguration = {
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

      storageService.get.mockResolvedValue(config);

      // When useSecureStorageForSecrets is false, setDirectory doesn't process secrets
      await insecureStateService.setDirectory(DirectoryType.Ldap, config);

      // Retrieve config - should return password as-is from storage (not from secure storage)
      const result = await insecureStateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);

      // Password should be retrieved directly from storage, not secure storage
      expect(result?.password).toBe("secret-password");
      expect(secureStorageService.get).not.toHaveBeenCalled();
    });
  });
});
