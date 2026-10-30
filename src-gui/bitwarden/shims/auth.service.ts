import { Observable } from "rxjs";

import { AuthenticationStatus } from "./authentication-status";

/**
 * Directory Connector has no locked/unlocked vault state, so nothing provides this token. The
 * vendored DialogService injects it optionally and skips closing dialogs on lock when it's absent.
 */
export abstract class AuthService {
  abstract getAuthStatus(userId?: string): Promise<AuthenticationStatus>;
  abstract authStatusFor$(userId: string): Observable<AuthenticationStatus>;
}
