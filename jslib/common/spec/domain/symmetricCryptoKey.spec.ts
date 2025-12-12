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
      const cryptoKey = new SymmetricCryptoKey(key);

      expect(cryptoKey.encType).toBe(0);
      expect(cryptoKey.keyB64).toBe("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=");
      expect(cryptoKey.encKeyB64).toBe("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=");
      expect(cryptoKey.macKey).toBeNull();
      expect(cryptoKey.key).toBeInstanceOf(ArrayBuffer);
      expect(cryptoKey.encKey).toBeInstanceOf(ArrayBuffer);
      expect(cryptoKey.key.byteLength).toBe(32);
      expect(cryptoKey.encKey.byteLength).toBe(32);
    });

    it("AesCbc128_HmacSha256_B64", () => {
      const key = makeStaticByteArray(32);
      const cryptoKey = new SymmetricCryptoKey(key, EncryptionType.AesCbc128_HmacSha256_B64);

      // After TS 5.9 upgrade, properties are ArrayBuffer not Uint8Array
      expect(cryptoKey.encType).toBe(1);
      expect(cryptoKey.keyB64).toBe("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=");
      expect(cryptoKey.encKeyB64).toBe("AAECAwQFBgcICQoLDA0ODw==");
      expect(cryptoKey.macKeyB64).toBe("EBESExQVFhcYGRobHB0eHw==");
      expect(cryptoKey.key).toBeInstanceOf(ArrayBuffer);
      expect(cryptoKey.encKey).toBeInstanceOf(ArrayBuffer);
      expect(cryptoKey.macKey).toBeInstanceOf(ArrayBuffer);
      expect(cryptoKey.key.byteLength).toBe(32);
      expect(cryptoKey.encKey.byteLength).toBe(16);
      expect(cryptoKey.macKey.byteLength).toBe(16);
    });

    it("AesCbc256_HmacSha256_B64", () => {
      const key = makeStaticByteArray(64);
      const cryptoKey = new SymmetricCryptoKey(key);

      // After TS 5.9 upgrade, properties are ArrayBuffer not Uint8Array
      expect(cryptoKey.encType).toBe(2);
      expect(cryptoKey.keyB64).toBe("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+Pw==");
      expect(cryptoKey.encKeyB64).toBe("AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=");
      expect(cryptoKey.macKeyB64).toBe("ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8=");
      expect(cryptoKey.key).toBeInstanceOf(ArrayBuffer);
      expect(cryptoKey.encKey).toBeInstanceOf(ArrayBuffer);
      expect(cryptoKey.macKey).toBeInstanceOf(ArrayBuffer);
      expect(cryptoKey.key.byteLength).toBe(64);
      expect(cryptoKey.encKey.byteLength).toBe(32);
      expect(cryptoKey.macKey.byteLength).toBe(32);
    });

    it("unknown length", () => {
      const t = () => {
        new SymmetricCryptoKey(makeStaticByteArray(30));
      };

      expect(t).toThrowError("Unable to determine encType.");
    });
  });
});
