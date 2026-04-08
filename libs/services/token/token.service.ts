import { StorageService } from "@/libs/abstractions/storage.service";
import { TokenService as TokenServiceAbstraction } from "@/libs/abstractions/token.service";
import { SecureStorageKeys } from "@/libs/models/state.model";

export class TokenService implements TokenServiceAbstraction {
  constructor(private secureStorageService: StorageService) {}

  static decodeToken(token: string): Promise<any> {
    if (token == null) {
      throw new Error("Token not provided.");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("JWT must have 3 parts");
    }

    const decoded = Buffer.from(parts[1], "base64url").toString("utf8");
    if (decoded == null) {
      throw new Error("Cannot decode the token");
    }

    const decodedToken = JSON.parse(decoded);
    return decodedToken;
  }

  async setTokens(
    accessToken: string,
    refreshToken: string,
    clientIdClientSecret?: [string, string],
  ): Promise<void> {
    await this.secureStorageService.save(SecureStorageKeys.accessToken, accessToken);
    await this.secureStorageService.save(SecureStorageKeys.refreshToken, refreshToken);

    if (clientIdClientSecret) {
      await this.secureStorageService.save(
        SecureStorageKeys.apiKeyClientId,
        clientIdClientSecret[0],
      );
      await this.secureStorageService.save(
        SecureStorageKeys.apiKeyClientSecret,
        clientIdClientSecret[1],
      );
    }
  }

  async getToken(): Promise<string | null> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.accessToken);
  }

  async getRefreshToken(): Promise<string | null> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.refreshToken);
  }

  async getClientId(): Promise<string | null> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.apiKeyClientId);
  }

  async getClientSecret(): Promise<string | null> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.apiKeyClientSecret);
  }

  async getTwoFactorToken(): Promise<string | null> {
    return await this.secureStorageService.get<string>(SecureStorageKeys.twoFactorToken);
  }

  async clearTwoFactorToken(): Promise<void> {
    await this.secureStorageService.remove(SecureStorageKeys.twoFactorToken);
  }

  // jwthelper methods
  // ref https://github.com/auth0/angular-jwt/blob/master/src/angularJwt/services/jwt.js

  async getDecodedToken(): Promise<any> {
    const token = await this.getToken();
    return TokenService.decodeToken(token);
  }

  async getTokenExpirationDate(): Promise<Date> {
    const decoded = await this.getDecodedToken();
    if (typeof decoded.exp === "undefined") {
      return null;
    }

    const d = new Date(0); // The 0 here is the key, which sets the date to the epoch
    d.setUTCSeconds(decoded.exp);
    return d;
  }

  async tokenSecondsRemaining(offsetSeconds = 0): Promise<number> {
    const d = await this.getTokenExpirationDate();
    if (d == null) {
      return 0;
    }

    const msRemaining = d.valueOf() - (new Date().valueOf() + offsetSeconds * 1000);
    return Math.round(msRemaining / 1000);
  }

  async tokenNeedsRefresh(minutes = 5): Promise<boolean> {
    const sRemaining = await this.tokenSecondsRemaining();
    return sRemaining < 60 * minutes;
  }
}
