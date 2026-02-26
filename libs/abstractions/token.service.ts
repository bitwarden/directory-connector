import { DecodedToken } from "@/libs/utils/jwt.util";

export abstract class TokenService {
  // Token storage
  abstract setTokens(
    accessToken: string,
    refreshToken: string,
    clientIdClientSecret?: [string, string],
  ): Promise<void>;
  abstract getToken(): Promise<string | null>;
  abstract getRefreshToken(): Promise<string | null>;
  abstract clearToken(): Promise<void>;

  // API key authentication
  abstract getClientId(): Promise<string | null>;
  abstract getClientSecret(): Promise<string | null>;

  // Two-factor token (rarely used)
  abstract getTwoFactorToken(): Promise<string | null>;
  abstract clearTwoFactorToken(): Promise<void>;

  // Token validation (delegates to jwt.util)
  abstract decodeToken(token?: string): Promise<DecodedToken | null>;
  abstract tokenNeedsRefresh(minutesBeforeExpiration?: number): Promise<boolean>;
}
