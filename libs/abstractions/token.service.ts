export abstract class TokenService {
  // Token storage
  abstract setTokens(
    accessToken: string,
    refreshToken: string,
    clientIdClientSecret?: [string, string],
  ): Promise<void>;
  abstract getToken(): Promise<string | null>;
  abstract getRefreshToken(): Promise<string | null>;

  // API key authentication
  abstract getClientId(): Promise<string | null>;
  abstract getClientSecret(): Promise<string | null>;

  // Two-factor token (rarely used)
  abstract getTwoFactorToken(): Promise<string | null>;
  abstract clearTwoFactorToken(): Promise<void>;

  // Token validation
  abstract getDecodedToken(token?: string): Promise<any>;
  abstract tokenNeedsRefresh(minutesBeforeExpiration?: number): Promise<boolean>;
}
