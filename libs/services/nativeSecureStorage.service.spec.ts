import { LogService } from "@/libs/abstractions/log.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { GSuiteConfiguration } from "@/libs/models/gsuiteConfiguration";
import { SecureStorageKeys } from "@/libs/models/state.model";
import { DefaultStateService } from "@/libs/services/state-service/default-state.service";

jest.mock("dc-native", () => ({
  passwords: {
    PASSWORD_NOT_FOUND: "Password not found.",
    getPassword: jest.fn(),
    setPassword: jest.fn(),
    deletePassword: jest.fn(),
  },
}));

import { MAX_SECRET_CHUNK_BYTES, NativeSecureStorageService } from "./nativeSecureStorage.service";

import { FakeStorageService } from "@/utils/fakeStorageService";

// Read after jest.mock (which is hoisted) so this is the mocked module.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { passwords } = require("dc-native");

const SERVICE_NAME = "Bitwarden Directory Connector";
const OWNER_EDIT_ERROR = "Invalid attempt to change the owner of this item.";

function makeLogService(): LogService {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    write: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
  } as unknown as LogService;
}

describe("NativeSecureStorageService", () => {
  let logService: LogService;
  let svc: NativeSecureStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    logService = makeLogService();
    svc = new NativeSecureStorageService(SERVICE_NAME, logService);
    passwords.getPassword.mockRejectedValue(new Error(passwords.PASSWORD_NOT_FOUND));
    passwords.setPassword.mockResolvedValue(undefined);
    passwords.deletePassword.mockResolvedValue(undefined);
  });

  describe("remove()", () => {
    it("resolves without error when the password does not exist", async () => {
      passwords.deletePassword.mockRejectedValue(new Error(passwords.PASSWORD_NOT_FOUND));

      await expect(svc.remove(SecureStorageKeys.accessToken)).resolves.toBeUndefined();
    });

    it("does not log a warning when the password does not exist", async () => {
      passwords.deletePassword.mockRejectedValue(new Error(passwords.PASSWORD_NOT_FOUND));

      await svc.remove(SecureStorageKeys.accessToken);

      expect(logService.warning).not.toHaveBeenCalled();
    });

    it("rethrows any other failure", async () => {
      passwords.deletePassword.mockRejectedValue(new Error(OWNER_EDIT_ERROR));

      await expect(svc.remove(SecureStorageKeys.accessToken)).rejects.toThrow(OWNER_EDIT_ERROR);
    });
  });

  describe("save()", () => {
    it("delegates to remove() when the value is null", async () => {
      await svc.save(SecureStorageKeys.accessToken, null);

      expect(passwords.deletePassword).toHaveBeenCalledWith(
        SERVICE_NAME,
        SecureStorageKeys.accessToken,
      );
      expect(passwords.setPassword).not.toHaveBeenCalled();
    });

    it("delegates to remove() when the value is undefined", async () => {
      await svc.save(SecureStorageKeys.accessToken, undefined);

      expect(passwords.deletePassword).toHaveBeenCalledWith(
        SERVICE_NAME,
        SecureStorageKeys.accessToken,
      );
    });

    it("stores the value as JSON", async () => {
      await svc.save(SecureStorageKeys.ldap, "ldap-password");

      expect(passwords.setPassword).toHaveBeenCalledWith(
        SERVICE_NAME,
        SecureStorageKeys.ldap,
        JSON.stringify("ldap-password"),
      );
    });

    it("rethrows when the underlying write fails", async () => {
      passwords.setPassword.mockRejectedValue(new Error(OWNER_EDIT_ERROR));

      await expect(svc.save(SecureStorageKeys.ldap, "ldap-password")).rejects.toThrow(
        OWNER_EDIT_ERROR,
      );
    });
  });

  describe("secret handling", () => {
    const secret = "sup3r-s3cret-ldap-p@ssword";

    it("does not include the stored value in any log call when a write fails", async () => {
      passwords.setPassword.mockRejectedValue(new Error(OWNER_EDIT_ERROR));

      await expect(svc.save(SecureStorageKeys.ldap, secret)).rejects.toThrow();

      const logged = JSON.stringify([
        (logService.warning as jest.Mock).mock.calls,
        (logService.error as jest.Mock).mock.calls,
        (logService.info as jest.Mock).mock.calls,
        (logService.debug as jest.Mock).mock.calls,
      ]);
      expect(logged).not.toContain(secret);
    });
  });

  describe("get()", () => {
    it("returns null when the password does not exist", async () => {
      passwords.getPassword.mockRejectedValue(new Error(passwords.PASSWORD_NOT_FOUND));

      await expect(svc.get(SecureStorageKeys.accessToken)).resolves.toBeNull();
    });

    it("returns null and warns when the stored value is not valid JSON", async () => {
      passwords.getPassword.mockResolvedValue("not-json");

      await expect(svc.get(SecureStorageKeys.accessToken)).resolves.toBeNull();
      expect(logService.warning).toHaveBeenCalled();
    });

    it("parses the stored JSON value", async () => {
      passwords.getPassword.mockResolvedValue(JSON.stringify("token-value"));

      await expect(svc.get(SecureStorageKeys.accessToken)).resolves.toBe("token-value");
    });

    it("rethrows unexpected read errors", async () => {
      passwords.getPassword.mockRejectedValue(new Error("keychain unavailable"));

      await expect(svc.get(SecureStorageKeys.accessToken)).rejects.toThrow("keychain unavailable");
    });
  });

  describe("large values (Windows Credential Manager blob limit)", () => {
    let keychain: FakeWindowsKeychain;

    beforeEach(() => {
      keychain = new FakeWindowsKeychain();
      keychain.install();
    });

    it("rejects oversized writes in the fake keychain, matching Windows", async () => {
      await expect(
        passwords.setPassword(SERVICE_NAME, "key", "a".repeat(WINDOWS_MAX_BLOB_BYTES)),
      ).rejects.toThrow("The parameter is incorrect.");
    });

    it("round-trips a value larger than a single credential can hold", async () => {
      await svc.save(SecureStorageKeys.gsuite, GOOGLE_PRIVATE_KEY);

      await expect(svc.get(SecureStorageKeys.gsuite)).resolves.toBe(GOOGLE_PRIVATE_KEY);
    });

    it("keeps every stored entry within the Windows blob limit", async () => {
      await svc.save(SecureStorageKeys.gsuite, GOOGLE_PRIVATE_KEY);

      expect(keychain.entries.size).toBeGreaterThan(1);
      for (const value of keychain.entries.values()) {
        expect(Buffer.byteLength(value, "utf8")).toBeLessThanOrEqual(MAX_SECRET_CHUNK_BYTES);
      }
    });

    it("stores small values in a single entry", async () => {
      await svc.save(SecureStorageKeys.ldap, "ldap-password");

      expect([...keychain.entries.keys()]).toEqual([SecureStorageKeys.ldap]);
    });

    it("does not split multi-byte characters across chunks", async () => {
      const value = "🔑é漢".repeat(400);

      await svc.save(SecureStorageKeys.gsuite, value);

      await expect(svc.get(SecureStorageKeys.gsuite)).resolves.toBe(value);
    });

    it("removes leftover chunks when a large value is replaced with a small one", async () => {
      await svc.save(SecureStorageKeys.gsuite, GOOGLE_PRIVATE_KEY);
      await svc.save(SecureStorageKeys.gsuite, "small");

      expect([...keychain.entries.keys()]).toEqual([SecureStorageKeys.gsuite]);
      await expect(svc.get(SecureStorageKeys.gsuite)).resolves.toBe("small");
    });

    it("removes leftover chunks when a large value is replaced with a shorter large value", async () => {
      await svc.save(SecureStorageKeys.gsuite, GOOGLE_PRIVATE_KEY + GOOGLE_PRIVATE_KEY);
      const chunksBefore = keychain.entries.size;

      await svc.save(SecureStorageKeys.gsuite, GOOGLE_PRIVATE_KEY);

      expect(keychain.entries.size).toBeLessThan(chunksBefore);
      await expect(svc.get(SecureStorageKeys.gsuite)).resolves.toBe(GOOGLE_PRIVATE_KEY);
    });

    it("removes all chunks when a chunked value is removed", async () => {
      await svc.save(SecureStorageKeys.gsuite, GOOGLE_PRIVATE_KEY);

      await svc.remove(SecureStorageKeys.gsuite);

      expect(keychain.entries.size).toBe(0);
      await expect(svc.get(SecureStorageKeys.gsuite)).resolves.toBeNull();
    });

    it("returns null and warns when a chunk is missing", async () => {
      await svc.save(SecureStorageKeys.gsuite, GOOGLE_PRIVATE_KEY);
      keychain.entries.delete(`${SecureStorageKeys.gsuite}:chunk:1`);

      await expect(svc.get(SecureStorageKeys.gsuite)).resolves.toBeNull();
      expect(logService.warning).toHaveBeenCalled();
    });

    it("still reads values stored unchunked by previous versions", async () => {
      keychain.entries.set(SecureStorageKeys.okta, JSON.stringify("legacy-token"));

      await expect(svc.get(SecureStorageKeys.okta)).resolves.toBe("legacy-token");
    });

    it("does not include the secret in any log call", async () => {
      await svc.save(SecureStorageKeys.gsuite, GOOGLE_PRIVATE_KEY);
      keychain.entries.delete(`${SecureStorageKeys.gsuite}:chunk:1`);
      await svc.get(SecureStorageKeys.gsuite);

      const logged = JSON.stringify([
        (logService.warning as jest.Mock).mock.calls,
        (logService.error as jest.Mock).mock.calls,
        (logService.info as jest.Mock).mock.calls,
        (logService.debug as jest.Mock).mock.calls,
      ]);
      expect(logged).not.toContain("MIIE");
    });

    // Regression: on Windows, saving Google Workspace settings failed because the private key
    // exceeded the Credential Manager blob limit, so the settings were never persisted and the
    // form appeared cleared after switching tabs.
    it("persists Google Workspace settings with a service account private key", async () => {
      const stateService = new DefaultStateService(new FakeStorageService(), svc, logService, {
        needsMigration: jest.fn().mockResolvedValue(false),
        migrate: jest.fn(),
        stampVersion: jest.fn(),
      });
      const config: GSuiteConfiguration = {
        domain: "company.com",
        adminUser: "admin@company.com",
        customer: "C0123abcd",
        clientEmail: "dc@my-project.iam.gserviceaccount.com",
        privateKey: GOOGLE_PRIVATE_KEY,
      };

      await expect(
        stateService.setDirectory(DirectoryType.GSuite, { ...config }),
      ).resolves.not.toThrow();

      const saved = await stateService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite);
      expect(saved).toEqual(expect.objectContaining(config));
    });
  });
});

/** Windows CRED_MAX_CREDENTIAL_BLOB_SIZE. */
const WINDOWS_MAX_BLOB_BYTES = 2560;

/** A realistically sized (2048-bit RSA, PKCS#8) service account private key, as found in a Google JSON key file. */
const GOOGLE_PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\n" +
  Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + (i % 26)).repeat(64)).join("\n") +
  "\n-----END PRIVATE KEY-----\n";

/**
 * In-memory stand-in for Windows Credential Manager behind the mocked dc-native module. Mirrors
 * desktop_core, which sizes the UTF-16 blob as `utf8ByteLength * 2` and fails when that exceeds
 * CRED_MAX_CREDENTIAL_BLOB_SIZE.
 */
class FakeWindowsKeychain {
  readonly entries = new Map<string, string>();

  install() {
    passwords.getPassword.mockImplementation(async (_service: string, key: string) => {
      if (!this.entries.has(key)) {
        throw new Error(passwords.PASSWORD_NOT_FOUND);
      }
      return this.entries.get(key);
    });
    passwords.setPassword.mockImplementation(
      async (_service: string, key: string, value: string) => {
        if (Buffer.byteLength(value, "utf8") * 2 > WINDOWS_MAX_BLOB_BYTES) {
          throw new Error("The parameter is incorrect. (0x80070057)");
        }
        this.entries.set(key, value);
      },
    );
    passwords.deletePassword.mockImplementation(async (_service: string, key: string) => {
      if (!this.entries.delete(key)) {
        throw new Error(passwords.PASSWORD_NOT_FOUND);
      }
    });
  }
}
