import { LogService } from "@/libs/abstractions/log.service";
import { SecureStorageKeys } from "@/libs/models/state.model";

jest.mock("dc-native", () => ({
  passwords: {
    PASSWORD_NOT_FOUND: "Password not found.",
    getPassword: jest.fn(),
    getPasswordVNext: jest.fn(),
    setPassword: jest.fn(),
    setPasswordVNext: jest.fn(),
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
    passwords.setPasswordVNext.mockResolvedValue(undefined);
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

    it("does not use the vNext read", async () => {
      passwords.getPassword.mockResolvedValue(JSON.stringify("token-value"));

      await svc.get(SecureStorageKeys.gsuite);

      expect(passwords.getPasswordVNext).not.toHaveBeenCalled();
    });
  });

  describe("getVNext()", () => {
    it("reads with getPasswordVNext and parses the stored JSON value", async () => {
      passwords.getPasswordVNext.mockResolvedValue(JSON.stringify("private-key"));

      await expect(svc.getVNext(SecureStorageKeys.gsuite)).resolves.toBe("private-key");
      expect(passwords.getPasswordVNext).toHaveBeenCalledWith(
        SERVICE_NAME,
        SecureStorageKeys.gsuite,
      );
      expect(passwords.getPassword).not.toHaveBeenCalled();
    });

    it("returns null when the password does not exist", async () => {
      passwords.getPasswordVNext.mockRejectedValue(new Error(passwords.PASSWORD_NOT_FOUND));

      await expect(svc.getVNext(SecureStorageKeys.gsuite)).resolves.toBeNull();
    });

    it("returns null and warns when the stored value is not valid JSON", async () => {
      passwords.getPasswordVNext.mockResolvedValue("not-json");

      await expect(svc.getVNext(SecureStorageKeys.gsuite)).resolves.toBeNull();
      expect(logService.warning).toHaveBeenCalled();
    });

    it("rethrows unexpected read errors", async () => {
      passwords.getPasswordVNext.mockRejectedValue(new Error("unsupported format version 2"));

      await expect(svc.getVNext(SecureStorageKeys.gsuite)).rejects.toThrow(
        "unsupported format version 2",
      );
    });
  });

  describe("saveVNext()", () => {
    it("stores the value as JSON with setPasswordVNext", async () => {
      await svc.saveVNext(SecureStorageKeys.gsuite, "private-key");

      expect(passwords.setPasswordVNext).toHaveBeenCalledWith(
        SERVICE_NAME,
        SecureStorageKeys.gsuite,
        JSON.stringify("private-key"),
      );
      expect(passwords.setPassword).not.toHaveBeenCalled();
    });

    it("delegates to remove() when the value is null", async () => {
      await svc.saveVNext(SecureStorageKeys.gsuite, null);

      expect(passwords.deletePassword).toHaveBeenCalledWith(SERVICE_NAME, SecureStorageKeys.gsuite);
      expect(passwords.setPasswordVNext).not.toHaveBeenCalled();
    });

    it("rethrows when the underlying write fails", async () => {
      passwords.setPasswordVNext.mockRejectedValue(new Error("Secret is too large"));

      await expect(svc.saveVNext(SecureStorageKeys.gsuite, "private-key")).rejects.toThrow(
        "Secret is too large",
      );
    });
  });

  describe("save()", () => {
    it("does not use the vNext write", async () => {
      await svc.save(SecureStorageKeys.gsuite, "private-key");

      expect(passwords.setPasswordVNext).not.toHaveBeenCalled();
    });
  });
});
