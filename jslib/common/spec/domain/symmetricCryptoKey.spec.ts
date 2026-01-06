import { EncryptionType } from "@/jslib/common/src/enums/encryptionType";
import { SymmetricCryptoKey } from "@/jslib/common/src/models/domain/symmetricCryptoKey";

import { makeStaticByteArray } from "../utils";

describe("SymmetricCryptoKey", () => {
  it("errors if no key", () => {
    const t = () => {
      new SymmetricCryptoKey(null);
    };

    expect(t).toThrowError("Must provide key");
  });

  describe("guesses encKey from key length", () => {
    it("AesCbc256_B64", () => {
      const key = makeStaticByteArray(32);
      const cryptoKey = new SymmetricCryptoKey(key.buffer as ArrayBuffer);

      expect(cryptoKey).toEqual({
        encKey: key,
        encKeyB64: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
        encType: 0,
        key: key,
        keyB64: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
        macKey: null,
      });
    });

    it("AesCbc128_HmacSha256_B64", () => {
      const key = makeStaticByteArray(32);
      const cryptoKey = new SymmetricCryptoKey(key.buffer as ArrayBuffer, EncryptionType.AesCbc128_HmacSha256_B64);

      expect(cryptoKey).toEqual({
        encKey: key.slice(0, 16),
        encKeyB64: "AAECAwQFBgcICQoLDA0ODw==",
        encType: 1,
        key: key,
        keyB64: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
        macKey: key.slice(16, 32),
        macKeyB64: "EBESExQVFhcYGRobHB0eHw==",
      });
    });

    it("AesCbc256_HmacSha256_B64", () => {
      const key = makeStaticByteArray(64);
      const cryptoKey = new SymmetricCryptoKey(key.buffer as ArrayBuffer);

      expect(cryptoKey).toEqual({
        encKey: key.slice(0, 32),
        encKeyB64: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
        encType: 2,
        key: key,
        keyB64:
          "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+Pw==",
        macKey: key.slice(32, 64),
        macKeyB64: "ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8=",
      });
    });

    it("unknown length", () => {
      const t = () => {
        new SymmetricCryptoKey(makeStaticByteArray(30).buffer as ArrayBuffer);
      };

      expect(t).toThrowError("Unable to determine encType.");
    });
  });
});
