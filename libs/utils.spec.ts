import { MAX_WINDOWS_CREDENTIAL_SECRET_BYTES } from "@/libs/constants";
import { ConnectorUtils } from "@/libs/utils";

describe("ConnectorUtils", () => {
  describe("exceedsWindowsCredentialByteLimit()", () => {
    it("is 2558 bytes", () => {
      expect(MAX_WINDOWS_CREDENTIAL_SECRET_BYTES).toBe(2558);
    });

    it("returns false for an empty string", () => {
      expect(ConnectorUtils.exceedsWindowsCredentialByteLimit("")).toBe(false);
    });

    it("returns false for null", () => {
      expect(ConnectorUtils.exceedsWindowsCredentialByteLimit(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(ConnectorUtils.exceedsWindowsCredentialByteLimit(undefined)).toBe(false);
    });

    // NativeSecureStorageService.save stores JSON.stringify(value), which wraps a plain ASCII
    // string in 2 quote bytes. So the usable ceiling for such a value is 2 bytes below the raw
    // blob limit.
    const JSON_QUOTE_OVERHEAD_BYTES = 2;

    it("returns false for an ASCII string exactly at the stored-payload byte limit", () => {
      const value = "a".repeat(MAX_WINDOWS_CREDENTIAL_SECRET_BYTES - JSON_QUOTE_OVERHEAD_BYTES);
      expect(ConnectorUtils.exceedsWindowsCredentialByteLimit(value)).toBe(false);
    });

    it("returns true for an ASCII string one byte over the stored-payload byte limit", () => {
      const value = "a".repeat(MAX_WINDOWS_CREDENTIAL_SECRET_BYTES - JSON_QUOTE_OVERHEAD_BYTES + 1);
      expect(ConnectorUtils.exceedsWindowsCredentialByteLimit(value)).toBe(true);
    });

    it("accounts for JSON.stringify's quote wrapping, not just the raw value", () => {
      // A value at the raw byte limit is 2 bytes over once JSON.stringify wraps it in quotes,
      // matching what NativeSecureStorageService.save actually sends to the native layer.
      const value = "a".repeat(MAX_WINDOWS_CREDENTIAL_SECRET_BYTES);

      expect(new TextEncoder().encode(value).length).toBe(MAX_WINDOWS_CREDENTIAL_SECRET_BYTES);
      expect(ConnectorUtils.exceedsWindowsCredentialByteLimit(value)).toBe(true);
    });

    it("accounts for JSON.stringify's character escaping (e.g. newlines in a PEM key)", () => {
      // Each escaped newline costs an extra byte once JSON-encoded ("\n" -> two chars).
      const value =
        "a".repeat(MAX_WINDOWS_CREDENTIAL_SECRET_BYTES - JSON_QUOTE_OVERHEAD_BYTES) + "\n";

      expect(ConnectorUtils.exceedsWindowsCredentialByteLimit(value)).toBe(true);
    });

    it("counts UTF-8 bytes, not UTF-16 code units, for multi-byte characters", () => {
      // Each 😀 is 2 UTF-16 code units (JS string .length) but 4 UTF-8 bytes.
      // 640 emoji = 1280 in .length (well under the byte limit if miscounted),
      // but 2560 UTF-8 bytes (over the 2558 byte limit) even before JSON overhead.
      const value = "😀".repeat(640);

      expect(value.length).toBeLessThan(MAX_WINDOWS_CREDENTIAL_SECRET_BYTES);
      expect(ConnectorUtils.exceedsWindowsCredentialByteLimit(value)).toBe(true);
    });
  });
});
