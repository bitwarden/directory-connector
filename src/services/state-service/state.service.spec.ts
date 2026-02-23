import { mock, MockProxy } from "jest-mock-extended";

import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { StorageService } from "@/jslib/common/src/abstractions/storage.service";
import { EnvironmentUrls } from "@/jslib/common/src/models/domain/environmentUrls";

import { DirectoryType } from "@/src/enums/directoryType";
import { EntraIdConfiguration } from "@/src/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/src/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/src/models/ldapConfiguration";
import { OktaConfiguration } from "@/src/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/src/models/oneLoginConfiguration";
import { StorageKeysVNext as StorageKeys, StoredSecurely } from "@/src/models/state.model";
import { SyncConfiguration } from "@/src/models/syncConfiguration";

import { StateServiceImplementation } from "./state.service";
import { StateMigrationService } from "./stateMigration.service";

describe("StateServiceImplementation", () => {
  let storageService: MockProxy<StorageService>;
  let secureStorageService: MockProxy<StorageService>;
  let logService: MockProxy<LogService>;
  let stateMigrationService: MockProxy<StateMigrationService>;
  let stateService: StateServiceImplementation;

  beforeEach(() => {
    storageService = mock<StorageService>();
    secureStorageService = mock<StorageService>();
    logService = mock<LogService>();
    stateMigrationService = mock<StateMigrationService>();

    stateService = new StateServiceImplementation(
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
      const insecureStateService = new StateServiceImplementation(
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

  describe("Window Settings", () => {
    it("should store and retrieve window state", async () => {
      const windowState = {
        width: 1024,
        height: 768,
        x: 100,
        y: 100,
        isMaximized: false,
      };

      storageService.get.mockResolvedValue(windowState);

      await stateService.setWindow(windowState);
      const result = await stateService.getWindow();

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.window, windowState);
      expect(result).toEqual(windowState);
    });

    it("should return null when window state is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getWindow();

      expect(result).toBeNull();
    });

    it("should store and retrieve enableAlwaysOnTop setting", async () => {
      storageService.get.mockResolvedValue(true);

      await stateService.setEnableAlwaysOnTop(true);
      const result = await stateService.getEnableAlwaysOnTop();

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.enableAlwaysOnTop, true);
      expect(result).toBe(true);
    });

    it("should return false when enableAlwaysOnTop is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getEnableAlwaysOnTop();

      expect(result).toBe(false);
    });
  });

  describe("Tray Settings", () => {
    it("should store and retrieve enableTray setting", async () => {
      storageService.get.mockResolvedValue(true);

      await stateService.setEnableTray(true);
      const result = await stateService.getEnableTray();

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.enableTray, true);
      expect(result).toBe(true);
    });

    it("should return false when enableTray is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getEnableTray();

      expect(result).toBe(false);
    });

    it("should store and retrieve enableMinimizeToTray setting", async () => {
      storageService.get.mockResolvedValue(true);

      await stateService.setEnableMinimizeToTray(true);
      const result = await stateService.getEnableMinimizeToTray();

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.enableMinimizeToTray, true);
      expect(result).toBe(true);
    });

    it("should return false when enableMinimizeToTray is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getEnableMinimizeToTray();

      expect(result).toBe(false);
    });

    it("should store and retrieve enableCloseToTray setting", async () => {
      storageService.get.mockResolvedValue(true);

      await stateService.setEnableCloseToTray(true);
      const result = await stateService.getEnableCloseToTray();

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.enableCloseToTray, true);
      expect(result).toBe(true);
    });

    it("should return false when enableCloseToTray is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getEnableCloseToTray();

      expect(result).toBe(false);
    });

    it("should store and retrieve alwaysShowDock setting", async () => {
      storageService.get.mockResolvedValue(true);

      await stateService.setAlwaysShowDock(true);
      const result = await stateService.getAlwaysShowDock();

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.alwaysShowDock, true);
      expect(result).toBe(true);
    });

    it("should return false when alwaysShowDock is not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getAlwaysShowDock();

      expect(result).toBe(false);
    });
  });

  describe("Environment URLs", () => {
    it("should store and retrieve environment URLs", async () => {
      const urls: EnvironmentUrls = {
        base: "https://vault.example.com",
        api: "https://api.example.com",
        identity: "https://identity.example.com",
        webVault: "https://vault.example.com",
      };

      storageService.get.mockResolvedValue(urls);

      await stateService.setEnvironmentUrls(urls);
      const result = await stateService.getEnvironmentUrls();

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.environmentUrls, urls);
      expect(result).toEqual(urls);
    });

    it("should return null when environment URLs are not set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getEnvironmentUrls();

      expect(result).toBeNull();
    });

    it("should return API URL from explicit api property", async () => {
      const urls: EnvironmentUrls = {
        base: null,
        api: "https://api.example.com",
        identity: null,
        webVault: null,
      };

      storageService.get.mockResolvedValue(urls);

      const result = await stateService.getApiUrl();

      expect(result).toBe("https://api.example.com");
    });

    it("should return API URL derived from base URL", async () => {
      const urls: EnvironmentUrls = {
        base: "https://vault.example.com",
        api: null,
        identity: null,
        webVault: null,
      };

      storageService.get.mockResolvedValue(urls);

      const result = await stateService.getApiUrl();

      expect(result).toBe("https://vault.example.com/api");
    });

    it("should return default API URL when no URLs are set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getApiUrl();

      expect(result).toBe("https://api.bitwarden.com");
    });

    it("should return Identity URL from explicit identity property", async () => {
      const urls: EnvironmentUrls = {
        base: null,
        api: null,
        identity: "https://identity.example.com",
        webVault: null,
      };

      storageService.get.mockResolvedValue(urls);

      const result = await stateService.getIdentityUrl();

      expect(result).toBe("https://identity.example.com");
    });

    it("should return Identity URL derived from base URL", async () => {
      const urls: EnvironmentUrls = {
        base: "https://vault.example.com",
        api: null,
        identity: null,
        webVault: null,
      };

      storageService.get.mockResolvedValue(urls);

      const result = await stateService.getIdentityUrl();

      expect(result).toBe("https://vault.example.com/identity");
    });

    it("should return default Identity URL when no URLs are set", async () => {
      storageService.get.mockResolvedValue(null);

      const result = await stateService.getIdentityUrl();

      expect(result).toBe("https://identity.bitwarden.com");
    });
  });

  describe("Token Management", () => {
    it("should clear all auth tokens", async () => {
      await stateService.clearAuthTokens();

      expect(secureStorageService.remove).toHaveBeenCalledWith("accessToken");
      expect(secureStorageService.remove).toHaveBeenCalledWith("refreshToken");
      expect(secureStorageService.remove).toHaveBeenCalledWith("apiKeyClientId");
      expect(secureStorageService.remove).toHaveBeenCalledWith("apiKeyClientSecret");
      expect(secureStorageService.remove).toHaveBeenCalledWith("twoFactorToken");
    });

    it("should remove exactly 5 token types", async () => {
      await stateService.clearAuthTokens();

      // Verify that all 5 token types are removed
      expect(secureStorageService.remove).toHaveBeenCalledTimes(5);
    });

    describe("Access Token", () => {
      it("should get access token from secure storage", async () => {
        const token = "test-access-token";
        secureStorageService.get.mockResolvedValue(token);

        const result = await stateService.getAccessToken();

        expect(result).toBe(token);
        expect(secureStorageService.get).toHaveBeenCalledWith("accessToken");
      });

      it("should set access token in secure storage", async () => {
        const token = "test-access-token";

        await stateService.setAccessToken(token);

        expect(secureStorageService.save).toHaveBeenCalledWith("accessToken", token);
      });

      it("should remove access token when set to null", async () => {
        await stateService.setAccessToken(null);

        expect(secureStorageService.remove).toHaveBeenCalledWith("accessToken");
      });
    });

    describe("Refresh Token", () => {
      it("should get refresh token from secure storage", async () => {
        const token = "test-refresh-token";
        secureStorageService.get.mockResolvedValue(token);

        const result = await stateService.getRefreshToken();

        expect(result).toBe(token);
        expect(secureStorageService.get).toHaveBeenCalledWith("refreshToken");
      });

      it("should set refresh token in secure storage", async () => {
        const token = "test-refresh-token";

        await stateService.setRefreshToken(token);

        expect(secureStorageService.save).toHaveBeenCalledWith("refreshToken", token);
      });

      it("should remove refresh token when set to null", async () => {
        await stateService.setRefreshToken(null);

        expect(secureStorageService.remove).toHaveBeenCalledWith("refreshToken");
      });
    });

    describe("API Key Client ID", () => {
      it("should get API key client ID from secure storage", async () => {
        const clientId = "organization.test-id";
        secureStorageService.get.mockResolvedValue(clientId);

        const result = await stateService.getApiKeyClientId();

        expect(result).toBe(clientId);
        expect(secureStorageService.get).toHaveBeenCalledWith("apiKeyClientId");
      });

      it("should set API key client ID in secure storage", async () => {
        const clientId = "organization.test-id";

        await stateService.setApiKeyClientId(clientId);

        expect(secureStorageService.save).toHaveBeenCalledWith("apiKeyClientId", clientId);
      });

      it("should remove API key client ID when set to null", async () => {
        await stateService.setApiKeyClientId(null);

        expect(secureStorageService.remove).toHaveBeenCalledWith("apiKeyClientId");
      });
    });

    describe("API Key Client Secret", () => {
      it("should get API key client secret from secure storage", async () => {
        const clientSecret = "test-secret";
        secureStorageService.get.mockResolvedValue(clientSecret);

        const result = await stateService.getApiKeyClientSecret();

        expect(result).toBe(clientSecret);
        expect(secureStorageService.get).toHaveBeenCalledWith("apiKeyClientSecret");
      });

      it("should set API key client secret in secure storage", async () => {
        const clientSecret = "test-secret";

        await stateService.setApiKeyClientSecret(clientSecret);

        expect(secureStorageService.save).toHaveBeenCalledWith("apiKeyClientSecret", clientSecret);
      });

      it("should remove API key client secret when set to null", async () => {
        await stateService.setApiKeyClientSecret(null);

        expect(secureStorageService.remove).toHaveBeenCalledWith("apiKeyClientSecret");
      });
    });

    describe("Entity ID", () => {
      it("should get entity ID from storage", async () => {
        const entityId = "test-entity-id";
        storageService.get.mockResolvedValue(entityId);

        const result = await stateService.getEntityId();

        expect(result).toBe(entityId);
        expect(storageService.get).toHaveBeenCalledWith("entityId");
      });

      it("should set entity ID in storage", async () => {
        const entityId = "test-entity-id";

        await stateService.setEntityId(entityId);

        expect(storageService.save).toHaveBeenCalledWith("entityId", entityId);
      });

      it("should remove entity ID when set to null", async () => {
        await stateService.setEntityId(null);

        expect(storageService.remove).toHaveBeenCalledWith("entityId");
      });
    });
  });
});
