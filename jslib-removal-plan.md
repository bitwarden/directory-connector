# Plan: Remove StateService and jslib Dependencies

## Context

Directory Connector currently depends on StateService from jslib, which is a massive pre-StateProvider monolith containing 200+ getter/setter methods for all Bitwarden clients. This creates significant maintenance burden and blocks deletion of unused jslib code.

**Current State (Phase 1 Complete):**

- ✅ StateServiceVNext has been implemented with a flat key-value structure
- ✅ Migration service handles transition from old account-based structure to new flat structure
- ⚠️ Both old and new StateService implementations coexist during migration
- ❌ Three jslib services still depend on old StateService: TokenService, CryptoService, EnvironmentService
- ❌ Two Electron components depend on old StateService: WindowMain, TrayMain

**Problem:**
The old StateService cannot be removed until all dependencies are eliminated. Analysis reveals:

- **TokenService**: Used for API authentication (9/32 methods actually used)
- **CryptoService**: Completely unused by DC (0/61 methods used) - carried over from monolith
- **EnvironmentService**: Used for custom server URLs (4/11 methods used)
- **WindowMain/TrayMain**: Used for Electron window/tray state persistence (6 methods total)

**Goal:**
Replace jslib services with simplified DC-specific implementations that use StateServiceVNext, enabling complete removal of old StateService and unlocking Phase 2 (jslib code cleanup).

**User Decisions:**

1. ✅ Create simplified DC-specific versions of Token/Environment services (clean break from jslib)
2. ✅ Keep WindowMain/TrayMain as-is (minimize scope, focus on StateService removal)
3. ✅ Automatic migration on first launch (transparent to users)

## Critical Files

### Files to Create (New Implementations)

- `src/services/token/token.service.ts` - DC-specific token service
- `src/abstractions/token.service.ts` - Token service interface
- `src/services/environment/environment.service.ts` - DC-specific environment service
- `src/abstractions/environment.service.ts` - Environment service interface
- `src/utils/jwt.util.ts` - JWT decoding utility (no dependencies)

### Files to Modify (Update Dependencies)

- `src/services/api.service.ts` - Switch from jslib TokenService to DC TokenService
- `src/services/auth.service.ts` - Update EnvironmentService import
- `src/services/sync.service.ts` - Update EnvironmentService import
- `src/commands/config.command.ts` - Update EnvironmentService import
- `src/bwdc.ts` - Remove old StateService, instantiate new services
- `src/main.ts` - Remove old StateService, instantiate new services
- `src/app/services/services.module.ts` - Remove old StateService, provide new services
- `src/app/app.component.ts` - Update TokenService import
- `jslib/electron/src/window.main.ts` - Adapt to use StateServiceVNext
- `jslib/electron/src/tray.main.ts` - Adapt to use StateServiceVNext

### Files to Delete (After Migration)

- `jslib/common/src/services/token.service.ts` - jslib TokenService
- `jslib/common/src/abstractions/token.service.ts` - jslib TokenService interface
- `jslib/common/src/services/crypto.service.ts` - Unused CryptoService
- `jslib/common/src/abstractions/crypto.service.ts` - Unused CryptoService interface
- `jslib/common/src/services/environment.service.ts` - jslib EnvironmentService
- `jslib/common/src/abstractions/environment.service.ts` - jslib EnvironmentService interface
- `src/services/state-service/state.service.ts` - Old DC StateService
- `src/abstractions/state.service.ts` - Old DC StateService interface
- `jslib/common/src/services/state.service.ts` - Old jslib StateService
- `jslib/common/src/abstractions/state.service.ts` - Old jslib StateService interface

## Implementation Plan

### Step 1: Create JWT Utility (No Dependencies)

Create `src/utils/jwt.util.ts` with standalone JWT decoding function:

```typescript
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
  if (!decoded.exp) return null;
  return new Date(decoded.exp * 1000);
}

export function tokenSecondsRemaining(token: string, offsetSeconds = 0): number {
  const expDate = getTokenExpirationDate(token);
  if (!expDate) return 0;

  const msRemaining = expDate.getTime() - Date.now() - offsetSeconds * 1000;
  return Math.floor(msRemaining / 1000);
}

export function tokenNeedsRefresh(token: string, minutesBeforeExpiration = 5): boolean {
  const secondsRemaining = tokenSecondsRemaining(token);
  return secondsRemaining < minutesBeforeExpiration * 60;
}
```

**Why:** Standalone utility avoids service dependencies, can be tested independently, reusable.

### Step 2: Create DC TokenService

Create `src/abstractions/token.service.ts`:

```typescript
export interface TokenService {
  // Token storage
  setTokens(
    accessToken: string,
    refreshToken: string,
    clientIdClientSecret?: [string, string],
  ): Promise<void>;
  getToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  clearToken(): Promise<void>;

  // API key authentication
  getClientId(): Promise<string | null>;
  getClientSecret(): Promise<string | null>;

  // Two-factor token (rarely used)
  getTwoFactorToken(): Promise<string | null>;
  clearTwoFactorToken(): Promise<void>;

  // Token validation (delegates to jwt.util)
  decodeToken(token?: string): Promise<DecodedToken | null>;
  tokenNeedsRefresh(minutesBeforeExpiration?: number): Promise<boolean>;
}
```

Create `src/services/token/token.service.ts`:

```typescript
import { StateServiceVNext } from "@/abstractions/state-vNext.service";
import { SecureStorageService } from "@/jslib/common/src/abstractions/storage.service";
import { TokenService as ITokenService } from "@/abstractions/token.service";
import {
  decodeJwt,
  tokenNeedsRefresh as checkTokenNeedsRefresh,
  DecodedToken,
} from "@/utils/jwt.util";

export class TokenService implements ITokenService {
  // Storage keys
  private TOKEN_KEY = "accessToken";
  private REFRESH_TOKEN_KEY = "refreshToken";
  private CLIENT_ID_KEY = "apiKeyClientId";
  private CLIENT_SECRET_KEY = "apiKeyClientSecret";
  private TWO_FACTOR_TOKEN_KEY = "twoFactorToken";

  constructor(
    private stateService: StateServiceVNext,
    private secureStorageService: SecureStorageService,
  ) {}

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
    if (!tokenToUse) return null;

    try {
      return decodeJwt(tokenToUse);
    } catch {
      return null;
    }
  }

  async tokenNeedsRefresh(minutesBeforeExpiration = 5): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return true;

    try {
      return checkTokenNeedsRefresh(token, minutesBeforeExpiration);
    } catch {
      return true;
    }
  }
}
```

Create `src/services/token/token.service.spec.ts` with comprehensive tests covering:

- Token storage/retrieval
- Token clearing
- JWT decoding
- Token expiration logic
- Error handling for malformed tokens

### Step 3: Create DC EnvironmentService

Create `src/abstractions/environment.service.ts`:

```typescript
export interface EnvironmentUrls {
  base?: string;
  api?: string;
  identity?: string;
  webVault?: string;
  icons?: string;
  notifications?: string;
  events?: string;
  keyConnector?: string;
}

export interface EnvironmentService {
  setUrls(urls: EnvironmentUrls): Promise<void>;
  setUrlsFromStorage(): Promise<void>;

  hasBaseUrl(): boolean;
  getApiUrl(): string;
  getIdentityUrl(): string;
  getWebVaultUrl(): string;
  getIconsUrl(): string;
  getNotificationsUrl(): string;
  getEventsUrl(): string;
  getKeyConnectorUrl(): string;
}
```

Create `src/services/environment/environment.service.ts`:

```typescript
import { StateServiceVNext } from "@/abstractions/state-vNext.service";
import {
  EnvironmentService as IEnvironmentService,
  EnvironmentUrls,
} from "@/abstractions/environment.service";

export class EnvironmentService implements IEnvironmentService {
  private readonly DEFAULT_URLS = {
    api: "https://api.bitwarden.com",
    identity: "https://identity.bitwarden.com",
    webVault: "https://vault.bitwarden.com",
    icons: "https://icons.bitwarden.net",
    notifications: "https://notifications.bitwarden.com",
    events: "https://events.bitwarden.com",
  };

  private urls: EnvironmentUrls = {};

  constructor(private stateService: StateServiceVNext) {}

  async setUrls(urls: EnvironmentUrls): Promise<void> {
    // Normalize URLs: trim whitespace, remove trailing slashes, add https:// if missing
    const normalized: EnvironmentUrls = {};

    for (const [key, value] of Object.entries(urls)) {
      if (!value) continue;

      let url = value.trim();
      url = url.replace(/\/+$/, ""); // Remove trailing slashes

      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }

      normalized[key] = url;
    }

    this.urls = normalized;
    await this.stateService.setEnvironmentUrls(normalized);
  }

  async setUrlsFromStorage(): Promise<void> {
    const stored = await this.stateService.getEnvironmentUrls();
    this.urls = stored ?? {};
  }

  hasBaseUrl(): boolean {
    return !!this.urls.base;
  }

  getApiUrl(): string {
    return this.urls.api ?? this.urls.base + "/api" ?? this.DEFAULT_URLS.api;
  }

  getIdentityUrl(): string {
    return this.urls.identity ?? this.urls.base + "/identity" ?? this.DEFAULT_URLS.identity;
  }

  getWebVaultUrl(): string {
    return this.urls.webVault ?? this.urls.base ?? this.DEFAULT_URLS.webVault;
  }

  getIconsUrl(): string {
    return this.urls.icons ?? this.urls.base + "/icons" ?? this.DEFAULT_URLS.icons;
  }

  getNotificationsUrl(): string {
    return (
      this.urls.notifications ??
      this.urls.base + "/notifications" ??
      this.DEFAULT_URLS.notifications
    );
  }

  getEventsUrl(): string {
    return this.urls.events ?? this.urls.base + "/events" ?? this.DEFAULT_URLS.events;
  }

  getKeyConnectorUrl(): string {
    return this.urls.keyConnector ?? "";
  }
}
```

Create `src/services/environment/environment.service.spec.ts` with tests covering:

- URL normalization (trailing slashes, https prefix)
- Storage persistence
- Default URL fallbacks
- Custom URL override
- Base URL derivation

### Step 4: Add Environment URL Storage to StateServiceVNext

Update `src/models/state.model.ts` to add environment URL storage key:

```typescript
export const StorageKeysVNext = {
  // ... existing keys ...
  environmentUrls: "environmentUrls",
};
```

Update `src/abstractions/state-vNext.service.ts` to add methods:

```typescript
export interface StateServiceVNext {
  // ... existing methods ...
  getEnvironmentUrls(): Promise<EnvironmentUrls | null>;
  setEnvironmentUrls(urls: EnvironmentUrls): Promise<void>;
}
```

Update `src/services/state-service/state-vNext.service.ts` implementation to add storage methods.

### Step 5: Update StateMigrationService for Token/Environment Data

Update `src/services/state-service/stateMigration.service.ts` to migrate:

**Token data (from secure storage):**

- `accessToken` → `accessToken` (same key, no change needed)
- `refreshToken` → `refreshToken` (same key, no change needed)
- `apiKeyClientId` → `apiKeyClientId` (same key, no change needed)
- `apiKeyClientSecret` → `apiKeyClientSecret` (same key, no change needed)

**Environment URLs (from account state):**

- `environmentUrls` from account → `environmentUrls` in flat structure

Add migration test cases to `src/services/state-service/stateMigration.service.spec.ts`.

### Step 6: Remove CryptoService Dependencies

Since CryptoService is completely unused by DC:

1. Search for all imports of `CryptoService` in `src/` code
2. Remove all instantiations and injections
3. Verify no methods are actually called
4. Remove from DI containers (services.module.ts, bwdc.ts, main.ts)

Expected: Zero usage, straightforward removal.

### Step 7: Update WindowMain/TrayMain to Use StateServiceVNext

Update `jslib/electron/src/window.main.ts`:

```typescript
// Change constructor to accept StateServiceVNext instead of StateService
constructor(
  private stateService: StateServiceVNext, // Changed from StateService
  // ... other params
) {}

// Update method calls to use StateServiceVNext interface
async getWindowSettings(): Promise<any> {
  return await this.stateService.getWindowSettings();
}

async setWindowSettings(settings: any): Promise<void> {
  await this.stateService.setWindowSettings(settings);
}
```

Update `jslib/electron/src/tray.main.ts` similarly:

```typescript
constructor(
  private stateService: StateServiceVNext, // Changed from StateService
  // ... other params
) {}

// Update method calls
async getEnableTray(): Promise<boolean> {
  return await this.stateService.getEnableTray();
}
// ... etc for other tray settings
```

**Required:** Add window/tray setting storage to StateServiceVNext:

- `getWindowSettings()` / `setWindowSettings()`
- `getEnableTray()` / `getEnableMinimizeToTray()` / `getEnableCloseToTray()` / `getAlwaysShowDock()`

### Step 8: Update Service Registrations

**In `src/app/services/services.module.ts`:**

```typescript
// Remove old services
- import { StateService } from '@/services/state-service/state.service';
- import { TokenService } from '@/jslib/common/src/services/token.service';
- import { CryptoService } from '@/jslib/common/src/services/crypto.service';
- import { EnvironmentService } from '@/jslib/common/src/services/environment.service';

// Add new services
+ import { TokenService } from '@/services/token/token.service';
+ import { EnvironmentService } from '@/services/environment/environment.service';

providers: [
  // Remove old StateService provider
  - { provide: StateService, useClass: StateService },

  // Add new service providers
  + { provide: TokenService, useClass: TokenService },
  + { provide: EnvironmentService, useClass: EnvironmentService },

  // Keep StateServiceVNext
  { provide: StateServiceVNext, useClass: StateServiceVNextImplementation },
]
```

**In `src/bwdc.ts` (CLI):**

```typescript
// Remove old service instantiations
- this.stateService = new StateService(/* ... */);
- this.cryptoService = new CryptoService(/* ... */);
- this.tokenService = new TokenService(/* ... */);
- this.environmentService = new EnvironmentService(this.stateService);

// Add new service instantiations
+ this.tokenService = new TokenService(this.stateServiceVNext, secureStorageService);
+ this.environmentService = new EnvironmentService(this.stateServiceVNext);
```

**In `src/main.ts` (Electron):**

```typescript
// Remove old service instantiations
- this.stateService = new StateService(/* ... */);
- this.cryptoService = new CryptoService(/* ... */);
- this.tokenService = new TokenService(/* ... */);
- this.environmentService = new EnvironmentService(this.stateService);

// Add new service instantiations
+ this.tokenService = new TokenService(this.stateServiceVNext, secureStorageService);
+ this.environmentService = new EnvironmentService(this.stateServiceVNext);

// Update WindowMain/TrayMain to use StateServiceVNext
- this.windowMain = new WindowMain(this.stateService, /* ... */);
- this.trayMain = new TrayMain(this.stateService, /* ... */);
+ this.windowMain = new WindowMain(this.stateServiceVNext, /* ... */);
+ this.trayMain = new TrayMain(this.stateServiceVNext, /* ... */);
```

### Step 9: Update Import Statements

Update all files that import Token/Environment services:

**Files to update:**

- `src/services/api.service.ts` - Change TokenService import to DC version
- `src/services/auth.service.ts` - Change EnvironmentService import to DC version
- `src/services/sync.service.ts` - Change EnvironmentService import to DC version
- `src/commands/config.command.ts` - Change EnvironmentService import to DC version
- `src/app/app.component.ts` - Change TokenService import to DC version

**Pattern:**

```typescript
// Before
import { TokenService } from "@/jslib/common/src/services/token.service";
import { EnvironmentService } from "@/jslib/common/src/services/environment.service";

// After
import { TokenService } from "@/abstractions/token.service";
import { EnvironmentService } from "@/abstractions/environment.service";
```

### Step 10: Delete Old StateService and jslib Services

**Delete these files (after all references removed):**

```bash
# Old StateService implementations
src/services/state-service/state.service.ts
src/abstractions/state.service.ts
jslib/common/src/services/state.service.ts
jslib/common/src/abstractions/state.service.ts

# jslib Token/Crypto/Environment services
jslib/common/src/services/token.service.ts
jslib/common/src/abstractions/token.service.ts
jslib/common/src/services/crypto.service.ts
jslib/common/src/abstractions/crypto.service.ts
jslib/common/src/services/environment.service.ts
jslib/common/src/abstractions/environment.service.ts
```

**Rename StateServiceVNext to StateService:**

```bash
# Rename files
mv src/services/state-service/state-vNext.service.ts src/services/state-service/state.service.ts
mv src/services/state-service/state-vNext.service.spec.ts src/services/state-service/state.service.spec.ts
mv src/abstractions/state-vNext.service.ts src/abstractions/state.service.ts

# Update all imports from StateServiceVNext to StateService
# Find and replace: StateServiceVNext → StateService
```

### Step 11: Update Tests

**Update existing tests that mock StateService:**

- Update mocks to use new StateService interface (flat key-value structure)
- Remove mocks for Token/Crypto/Environment services where they inject old versions
- Add mocks for new DC Token/Environment services

**Add new test files:**

- `src/services/token/token.service.spec.ts` (created in Step 2)
- `src/services/environment/environment.service.spec.ts` (created in Step 3)
- `src/utils/jwt.util.spec.ts` (JWT utility tests)

**Update integration tests:**

- Verify token storage/retrieval works correctly
- Verify environment URL configuration persists
- Verify window/tray settings persist in Electron app

## Verification Plan

### Unit Tests

```bash
npm test  # Run all unit tests
```

**Expected:**

- All new service tests pass (TokenService, EnvironmentService, JWT util)
- All existing tests pass with updated mocks
- No test failures due to StateService removal

### Integration Tests

```bash
npm run test:integration
```

**Expected:**

- LDAP sync tests pass
- Authentication flow works correctly
- Configuration persistence works

### Manual Testing - CLI

```bash
# Build and run CLI
npm run build:cli:watch
node ./build-cli/bwdc.js --help

# Test authentication
node ./build-cli/bwdc.js config server https://vault.bitwarden.com
node ./build-cli/bwdc.js login --apikey

# Test sync
node ./build-cli/bwdc.js config directory ldap
node ./build-cli/bwdc.js config ldap.hostname ldap.example.com
node ./build-cli/bwdc.js sync

# Test logout
node ./build-cli/bwdc.js logout
```

**Verify:**

- ✅ Server URL configuration persists
- ✅ Login stores tokens correctly
- ✅ Token refresh works automatically
- ✅ Sync completes successfully
- ✅ Logout clears tokens

### Manual Testing - Desktop App

```bash
# Build and run desktop app
npm run electron
```

**Verify:**

- ✅ Window position/size persists across restarts
- ✅ "Always on top" setting persists
- ✅ Tray icon shows/hides based on settings
- ✅ Minimize/close to tray works
- ✅ Login/logout flow works
- ✅ Sync functionality works
- ✅ Custom server URL configuration works

### Migration Testing

**Test migration from existing installation:**

1. Install current production version
2. Configure directory connection and run sync
3. Install new version with StateService removal
4. Launch app - verify automatic migration occurs
5. Verify all settings preserved:
   - Directory configuration
   - Organization ID
   - Server URLs
   - Window/tray settings
   - Authentication tokens

**Expected:**

- ✅ Migration runs automatically on first launch
- ✅ All user data preserved
- ✅ No user action required
- ✅ App functions identically to before

### Regression Testing

Run through all major workflows:

1. **Configuration**: Set up each directory type (LDAP, Entra, Google, Okta, OneLogin)
2. **Authentication**: Login with API key, verify token refresh
3. **Sync**: Full sync, incremental sync (delta tokens), detect changes via hash
4. **Custom server**: Configure self-hosted Bitwarden server
5. **Electron features**: Window management, tray behavior

**Expected:** No regressions in functionality.

## Rollback Plan

If critical issues discovered post-deployment:

1. **Revert commit** removing StateService
2. **Keep StateServiceVNext in parallel** (already coexisting)
3. **Debug issues** in development
4. **Re-attempt removal** after fixes

**Risk Assessment:** Low - StateServiceVNext has been in production since Phase 1 PR merge, proven stable.

## Success Criteria

- ✅ All old StateService implementations deleted
- ✅ StateServiceVNext renamed to StateService (becomes primary)
- ✅ jslib TokenService, CryptoService, EnvironmentService deleted
- ✅ DC-specific Token/Environment services implemented and tested
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ Manual testing shows no regressions
- ✅ Migration from old state structure works automatically
- ✅ WindowMain/TrayMain adapted to new StateService
- ✅ Zero references to old StateService in codebase

## Next Steps (After Completion)

This unblocks **Phase 2: Remove Remaining jslib Code**:

- Delete unused jslib models (AccountData, AccountSettings, etc.)
- Delete unused jslib services that referenced StateService
- Clean up jslib/common folder of unused client code
- Potentially merge remaining jslib code into src/ (flatten structure)

Estimated effort: 2-3 days for experienced developer familiar with codebase.
