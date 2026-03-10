export interface DecodedToken {
  exp: number;
  iat: number;
  nbf: number;
  sub: string; // user ID
  client_id?: string;
  [key: string]: any;
}

export function decodeJwt(token: string): DecodedToken {
  // Validate JWT structure (3 parts: header.payload.signature)
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  // Decode payload (base64url to JSON)
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");

  return JSON.parse(atob(payload));
}

export function getTokenExpirationDate(token: string): Date | null {
  const decoded = decodeJwt(token);
  if (!decoded.exp) {
    return null;
  }
  return new Date(decoded.exp * 1000);
}

export function tokenSecondsRemaining(token: string, offsetSeconds = 0): number {
  const expDate = getTokenExpirationDate(token);
  if (!expDate) {
    return 0;
  }

  const msRemaining = expDate.getTime() - Date.now() - offsetSeconds * 1000;
  return Math.floor(msRemaining / 1000);
}

export function tokenNeedsRefresh(token: string, minutesBeforeExpiration = 5): boolean {
  const secondsRemaining = tokenSecondsRemaining(token);
  return secondsRemaining < minutesBeforeExpiration * 60;
}
