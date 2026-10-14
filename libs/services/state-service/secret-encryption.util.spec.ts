import * as nodeCrypto from "crypto";

import {
  decryptSecret,
  encryptSecret,
  generateSecretEncryptionKey,
} from "./secret-encryption.util";

const PRIVATE_KEY =
  "-----BEGIN PRIVATE KEY-----\n" +
  Array.from({ length: 26 }, () => "A".repeat(64)).join("\n") +
  "\n-----END PRIVATE KEY-----\n";

describe("secret-encryption.util", () => {
  it("generates a 512-bit key", () => {
    expect(Buffer.from(generateSecretEncryptionKey(), "base64")).toHaveLength(64);
  });

  it("generates a different key each time", () => {
    expect(generateSecretEncryptionKey()).not.toBe(generateSecretEncryptionKey());
  });

  it("keeps the key small enough for Windows Credential Manager", () => {
    // desktop_core stores values as JSON in UTF-16; Credential Manager's limit is 2560 bytes.
    expect(JSON.stringify(generateSecretEncryptionKey()).length * 2).toBeLessThan(2560);
  });

  it("round-trips a service account private key", async () => {
    const key = generateSecretEncryptionKey();

    const encrypted = await encryptSecret(PRIVATE_KEY, key);

    await expect(decryptSecret(encrypted, key)).resolves.toBe(PRIVATE_KEY);
  });

  it("round-trips non-ASCII text", async () => {
    const key = generateSecretEncryptionKey();
    const value = "pässwörd 漢字 🔑";

    await expect(decryptSecret(await encryptSecret(value, key), key)).resolves.toBe(value);
  });

  it("produces Bitwarden's AES-256-CBC + HMAC-SHA256 EncString format", async () => {
    const key = Buffer.from(generateSecretEncryptionKey(), "base64");

    const encrypted = await encryptSecret(PRIVATE_KEY, key.toString("base64"));

    // Decrypt independently with Node's crypto module, the way EncryptService does for type 2.
    const [type, rest] = encrypted.split(".");
    const [iv, data, mac] = rest.split("|").map((part) => Buffer.from(part, "base64"));
    const expectedMac = nodeCrypto
      .createHmac("sha256", key.subarray(32))
      .update(Buffer.concat([iv, data]))
      .digest();
    const decipher = nodeCrypto.createDecipheriv("aes-256-cbc", key.subarray(0, 32), iv);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");

    expect(type).toBe("2");
    expect(iv).toHaveLength(16);
    expect(mac.equals(expectedMac)).toBe(true);
    expect(plaintext).toBe(PRIVATE_KEY);
  });

  it("uses a random IV, so the same secret encrypts differently each time", async () => {
    const key = generateSecretEncryptionKey();

    expect(await encryptSecret(PRIVATE_KEY, key)).not.toBe(await encryptSecret(PRIVATE_KEY, key));
  });

  it("rejects a value encrypted with a different key", async () => {
    const encrypted = await encryptSecret(PRIVATE_KEY, generateSecretEncryptionKey());

    await expect(decryptSecret(encrypted, generateSecretEncryptionKey())).rejects.toThrow(
      "integrity check",
    );
  });

  it("rejects a tampered MAC", async () => {
    const key = generateSecretEncryptionKey();
    const [prefix, mac] = (await encryptSecret(PRIVATE_KEY, key)).split(/\|(?=[^|]*$)/);
    const tamperedMac = (mac[0] === "A" ? "B" : "A") + mac.slice(1);

    await expect(decryptSecret(`${prefix}|${tamperedMac}`, key)).rejects.toThrow("integrity check");
  });

  it.each([
    ["an unsupported encryption type", "0.aXY=|ZGF0YQ==|bWFj"],
    ["a missing MAC", "2.aXY=|ZGF0YQ=="],
    ["an unencrypted value", PRIVATE_KEY],
  ])("rejects %s", async (_, value) => {
    await expect(decryptSecret(value, generateSecretEncryptionKey())).rejects.toThrow(
      "Unsupported encrypted secret format",
    );
  });

  it("rejects a key of the wrong length", async () => {
    await expect(encryptSecret(PRIVATE_KEY, Buffer.alloc(32).toString("base64"))).rejects.toThrow(
      "Invalid secret encryption key",
    );
  });
});
