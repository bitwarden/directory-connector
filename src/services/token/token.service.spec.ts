import { mock, MockProxy } from "jest-mock-extended";

import { StorageService } from "@/jslib/common/src/abstractions/storage.service";
import { Utils } from "@/jslib/common/src/misc/utils";

import { SecureStorageKeys } from "@/src/models/state.model";

import { TokenService } from "./token.service";

// Helper to build a JWT with a given payload
function buildJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("TokenService", () => {
  let secureStorageService: MockProxy<StorageService>;
  let tokenService: TokenService;

  beforeEach(() => {
    Utils.isNode = true;
    secureStorageService = mock<StorageService>();
    tokenService = new TokenService(secureStorageService);
  });

  describe("decodeToken (static)", () => {
    it("should throw when token is null", () => {
      expect(() => TokenService.decodeToken(null)).toThrow("Token not provided.");
    });

    it("should throw when token does not have 3 parts", () => {
      expect(() => TokenService.decodeToken("only.twoparts")).toThrow("JWT must have 3 parts");
    });

    it("should return parsed payload for a valid JWT", () => {
      const payload = { sub: "user-123", email: "test@example.com", exp: 9999999999 };
      const token = buildJwt(payload);

      const result = TokenService.decodeToken(token);

      expect(result).toMatchObject(payload);
    });
  });

  describe("setTokens", () => {
    it("should save access token and refresh token", async () => {
      await tokenService.setTokens("access", "refresh");

      expect(secureStorageService.save).toHaveBeenCalledWith(
        SecureStorageKeys.accessToken,
        "access",
      );
      expect(secureStorageService.save).toHaveBeenCalledWith(
        SecureStorageKeys.refreshToken,
        "refresh",
      );
    });

    it("should not save client credentials when not provided", async () => {
      await tokenService.setTokens("access", "refresh");

      expect(secureStorageService.save).not.toHaveBeenCalledWith(
        SecureStorageKeys.apiKeyClientId,
        expect.anything(),
      );
      expect(secureStorageService.save).not.toHaveBeenCalledWith(
        SecureStorageKeys.apiKeyClientSecret,
        expect.anything(),
      );
    });

    it("should save client credentials when provided", async () => {
      await tokenService.setTokens("access", "refresh", ["client-id", "client-secret"]);

      expect(secureStorageService.save).toHaveBeenCalledWith(
        SecureStorageKeys.apiKeyClientId,
        "client-id",
      );
      expect(secureStorageService.save).toHaveBeenCalledWith(
        SecureStorageKeys.apiKeyClientSecret,
        "client-secret",
      );
    });
  });

  describe("getToken", () => {
    it("should return access token from secure storage", async () => {
      secureStorageService.get.mockResolvedValue("access-token");

      const result = await tokenService.getToken();

      expect(result).toBe("access-token");
      expect(secureStorageService.get).toHaveBeenCalledWith(SecureStorageKeys.accessToken);
    });

    it("should return null when access token is not set", async () => {
      secureStorageService.get.mockResolvedValue(null);

      const result = await tokenService.getToken();

      expect(result).toBeNull();
    });
  });

  describe("getRefreshToken", () => {
    it("should return refresh token from secure storage", async () => {
      secureStorageService.get.mockResolvedValue("refresh-token");

      const result = await tokenService.getRefreshToken();

      expect(result).toBe("refresh-token");
      expect(secureStorageService.get).toHaveBeenCalledWith(SecureStorageKeys.refreshToken);
    });

    it("should return null when refresh token is not set", async () => {
      secureStorageService.get.mockResolvedValue(null);

      const result = await tokenService.getRefreshToken();

      expect(result).toBeNull();
    });
  });

  describe("getClientId", () => {
    it("should return client ID from secure storage", async () => {
      secureStorageService.get.mockResolvedValue("organization.client-id");

      const result = await tokenService.getClientId();

      expect(result).toBe("organization.client-id");
      expect(secureStorageService.get).toHaveBeenCalledWith(SecureStorageKeys.apiKeyClientId);
    });

    it("should return null when client ID is not set", async () => {
      secureStorageService.get.mockResolvedValue(null);

      const result = await tokenService.getClientId();

      expect(result).toBeNull();
    });
  });

  describe("getClientSecret", () => {
    it("should return client secret from secure storage", async () => {
      secureStorageService.get.mockResolvedValue("client-secret");

      const result = await tokenService.getClientSecret();

      expect(result).toBe("client-secret");
      expect(secureStorageService.get).toHaveBeenCalledWith(SecureStorageKeys.apiKeyClientSecret);
    });

    it("should return null when client secret is not set", async () => {
      secureStorageService.get.mockResolvedValue(null);

      const result = await tokenService.getClientSecret();

      expect(result).toBeNull();
    });
  });

  describe("getTwoFactorToken", () => {
    it("should return two-factor token from secure storage", async () => {
      secureStorageService.get.mockResolvedValue("2fa-token");

      const result = await tokenService.getTwoFactorToken();

      expect(result).toBe("2fa-token");
      expect(secureStorageService.get).toHaveBeenCalledWith(SecureStorageKeys.twoFactorToken);
    });

    it("should return null when two-factor token is not set", async () => {
      secureStorageService.get.mockResolvedValue(null);

      const result = await tokenService.getTwoFactorToken();

      expect(result).toBeNull();
    });
  });

  describe("clearTwoFactorToken", () => {
    it("should remove two-factor token from secure storage", async () => {
      await tokenService.clearTwoFactorToken();

      expect(secureStorageService.remove).toHaveBeenCalledWith(SecureStorageKeys.twoFactorToken);
    });
  });

  describe("getDecodedToken", () => {
    it("should return decoded JWT payload from stored access token", async () => {
      const payload = { sub: "user-abc", email: "user@example.com", exp: 9999999999 };
      secureStorageService.get.mockResolvedValue(buildJwt(payload));

      const result = await tokenService.getDecodedToken();

      expect(result).toMatchObject(payload);
    });
  });

  describe("getTokenExpirationDate", () => {
    it("should return expiration date from token", async () => {
      const exp = 2000000000; // 2033-05-18
      const payload = { sub: "user-abc", exp };
      secureStorageService.get.mockResolvedValue(buildJwt(payload));

      const result = await tokenService.getTokenExpirationDate();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(exp * 1000);
    });

    it("should return null when token has no exp claim", async () => {
      const payload = { sub: "user-abc" };
      secureStorageService.get.mockResolvedValue(buildJwt(payload));

      const result = await tokenService.getTokenExpirationDate();

      expect(result).toBeNull();
    });
  });

  describe("tokenSecondsRemaining", () => {
    it("should return seconds remaining until token expiration", async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      secureStorageService.get.mockResolvedValue(buildJwt({ sub: "u", exp: futureExp }));

      const result = await tokenService.tokenSecondsRemaining();

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(600);
    });

    it("should return 0 when token has no exp claim", async () => {
      secureStorageService.get.mockResolvedValue(buildJwt({ sub: "u" }));

      const result = await tokenService.tokenSecondsRemaining();

      expect(result).toBe(0);
    });

    it("should account for offset seconds", async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600;
      secureStorageService.get.mockResolvedValue(buildJwt({ sub: "u", exp: futureExp }));

      const withoutOffset = await tokenService.tokenSecondsRemaining(0);
      const withOffset = await tokenService.tokenSecondsRemaining(300);

      expect(withoutOffset - withOffset).toBeCloseTo(300, -1);
    });
  });

  describe("tokenNeedsRefresh", () => {
    it("should return true when token has less than 5 minutes remaining", async () => {
      const exp = Math.floor(Date.now() / 1000) + 60; // only 1 minute left
      secureStorageService.get.mockResolvedValue(buildJwt({ sub: "u", exp }));

      const result = await tokenService.tokenNeedsRefresh();

      expect(result).toBe(true);
    });

    it("should return false when token has more than 5 minutes remaining", async () => {
      const exp = Math.floor(Date.now() / 1000) + 600; // 10 minutes left
      secureStorageService.get.mockResolvedValue(buildJwt({ sub: "u", exp }));

      const result = await tokenService.tokenNeedsRefresh();

      expect(result).toBe(false);
    });

    it("should use custom minutes threshold when provided", async () => {
      const exp = Math.floor(Date.now() / 1000) + 360; // 6 minutes left
      secureStorageService.get.mockResolvedValue(buildJwt({ sub: "u", exp }));

      // With default 5-minute threshold: should NOT need refresh (6 > 5)
      const defaultThreshold = await tokenService.tokenNeedsRefresh();
      // With 10-minute threshold: should need refresh (6 < 10)
      const higherThreshold = await tokenService.tokenNeedsRefresh(10);

      expect(defaultThreshold).toBe(false);
      expect(higherThreshold).toBe(true);
    });
  });
});
