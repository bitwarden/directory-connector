import { LogService } from "@/libs/abstractions/log.service";
import { SecureStorageKeys } from "@/libs/models/state.model";

jest.mock("dc-native", () => ({
  passwords: {
    PASSWORD_NOT_FOUND: "Password not found.",
    getPassword: jest.fn(),
    setPassword: jest.fn(),
    deletePassword: jest.fn(),
  },
}));

import { NativeSecureStorageService } from "./nativeSecureStorage.service";

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

    it("rethrows with recovery instructions when the keychain entry cannot be modified", async () => {
      passwords.deletePassword.mockRejectedValue(new Error(OWNER_EDIT_ERROR));

      await expect(svc.remove(SecureStorageKeys.accessToken)).rejects.toThrow(
        /open Keychain Access/,
      );
    });

    it("names the failing key and the keychain service in the error", async () => {
      passwords.deletePassword.mockRejectedValue(new Error(OWNER_EDIT_ERROR));

      await expect(svc.remove(SecureStorageKeys.accessToken)).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringContaining(SecureStorageKeys.accessToken),
        }),
      );
      await expect(svc.remove(SecureStorageKeys.accessToken)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining(SERVICE_NAME) }),
      );
    });

    it("preserves the underlying message for diagnostics", async () => {
      passwords.deletePassword.mockRejectedValue(new Error(OWNER_EDIT_ERROR));

      await expect(svc.remove(SecureStorageKeys.accessToken)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining(OWNER_EDIT_ERROR) }),
      );
    });

    it("logs a warning naming the key", async () => {
      passwords.deletePassword.mockRejectedValue(new Error(OWNER_EDIT_ERROR));

      await expect(svc.remove(SecureStorageKeys.accessToken)).rejects.toThrow();

      expect(logService.warning).toHaveBeenCalledWith(
        expect.stringContaining(SecureStorageKeys.accessToken),
      );
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

    it("rethrows with recovery instructions when the keychain entry cannot be modified", async () => {
      passwords.setPassword.mockRejectedValue(new Error(OWNER_EDIT_ERROR));

      await expect(svc.save(SecureStorageKeys.ldap, "ldap-password")).rejects.toThrow(
        /open Keychain Access/,
      );
    });
  });

  describe("secret handling", () => {
    const secret = "sup3r-s3cret-ldap-p@ssword";

    it("does not include the stored value in the thrown error", async () => {
      passwords.setPassword.mockRejectedValue(new Error(OWNER_EDIT_ERROR));

      await expect(svc.save(SecureStorageKeys.ldap, secret)).rejects.toThrow(
        expect.objectContaining({ message: expect.not.stringContaining(secret) }),
      );
    });

    it("does not include the stored value in any log call", async () => {
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
});
