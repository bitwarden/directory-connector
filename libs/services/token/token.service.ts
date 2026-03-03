import { TokenService as ITokenService } from "@/libs/abstractions/token.service";
import {
  DecodedToken,
  decodeJwt,
  tokenNeedsRefresh as checkTokenNeedsRefresh,
} from "@/libs/utils/jwt.util";

import { StorageService } from "@/jslib/common/src/abstractions/storage.service";

export class TokenService implements ITokenService {
  // Storage keys
  private TOKEN_KEY = "accessToken";
  private REFRESH_TOKEN_KEY = "refreshToken";
  private CLIENT_ID_KEY = "apiKeyClientId";
  private CLIENT_SECRET_KEY = "apiKeyClientSecret";
  private TWO_FACTOR_TOKEN_KEY = "twoFactorToken";

  constructor(private secureStorageService: StorageService) {}

  async setTokens(
    accessToken: string,
    refreshToken: string,
    clientIdClientSecret?: [string, string],
  ): Promise<void> {
    await this.secureStorageService.save(this.TOKEN_KEY, accessToken);
    await this.secureStorageService.save(this.REFRESH_TOKEN_KEY, refreshToken);

    if (clientIdClientSecret) {
      await this.secureStorageService.save(this.CLIENT_ID_KEY, clientIdClientSecret[0]);
      await this.secureStorageService.save(this.CLIENT_SECRET_KEY, clientIdClientSecret[1]);
    }
  }

  async getToken(): Promise<string | null> {
    return await this.secureStorageService.get<string>(this.TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    return await this.secureStorageService.get<string>(this.REFRESH_TOKEN_KEY);
  }

  async clearToken(): Promise<void> {
    await this.secureStorageService.remove(this.TOKEN_KEY);
    await this.secureStorageService.remove(this.REFRESH_TOKEN_KEY);
    await this.secureStorageService.remove(this.CLIENT_ID_KEY);
    await this.secureStorageService.remove(this.CLIENT_SECRET_KEY);
  }

  async getClientId(): Promise<string | null> {
    return await this.secureStorageService.get<string>(this.CLIENT_ID_KEY);
  }

  async getClientSecret(): Promise<string | null> {
    return await this.secureStorageService.get<string>(this.CLIENT_SECRET_KEY);
  }

  async getTwoFactorToken(): Promise<string | null> {
    return await this.secureStorageService.get<string>(this.TWO_FACTOR_TOKEN_KEY);
  }

  async clearTwoFactorToken(): Promise<void> {
    await this.secureStorageService.remove(this.TWO_FACTOR_TOKEN_KEY);
  }

  async decodeToken(token?: string): Promise<DecodedToken | null> {
    const tokenToUse = token ?? (await this.getToken());
    if (!tokenToUse) {
      return null;
    }

    try {
      return decodeJwt(tokenToUse);
    } catch {
      return null;
    }
  }

  async tokenNeedsRefresh(minutesBeforeExpiration = 5): Promise<boolean> {
    const token = await this.getToken();
    if (!token) {
      return true;
    }

    try {
      return checkTokenNeedsRefresh(token, minutesBeforeExpiration);
    } catch {
      return true;
    }
  }
}
