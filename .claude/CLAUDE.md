# Bitwarden Directory Connector - Claude Code Configuration

Sync users and groups from enterprise directory services (LDAP, Entra ID, Google Workspace, Okta, OneLogin) to Bitwarden organizations. Available as both a desktop GUI (Electron + Angular) and a CLI tool (`bwdc`).

## Overview

### What This Project Does

- Connects to enterprise identity providers and retrieves user/group membership data
- Syncs that data to Bitwarden organizations via the Directory Connector API
- Provides both a desktop GUI application (Electron) and a command-line interface (`bwdc`)

### Key Concepts

- **Directory Service**: An identity provider (LDAP, Entra ID, GSuite, Okta, OneLogin) that stores users and groups
- **Sync**: The process of fetching entries from a directory and importing them to Bitwarden
- **Delta Sync**: Incremental synchronization that only fetches changes since the last sync
- **Entry**: Base class for `UserEntry` and `GroupEntry` - the core data models
- **Force Sync**: Ignores delta tokens and fetches all entries fresh
- **Test Mode**: Simulates sync without making API calls or updating state

---

## Architecture & Patterns

### System Architecture

```
                    User Request (GUI/CLI)
                            ↓
            ┌───────────────────────────────────┐
            │          Entry Points             │
            │   main.ts (GUI)  │  bwdc.ts (CLI) │
            └───────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │           SyncService             │
            │   Orchestrates the sync flow      │
            └───────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │      DirectoryFactoryService      │
            │   Creates appropriate IDirectory  │
            └───────────────────────────────────┘
                            ↓
    ┌─────────────────────────────────────────────────────┐
    │              Directory Services                      │
    │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐ │
    │ │  LDAP   │ │ EntraID │ │ GSuite  │ │ Okta/1Login │ │
    │ └─────────┘ └─────────┘ └─────────┘ └─────────────┘ │
    └─────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │        [GroupEntry[], UserEntry[]]│
            └───────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │       RequestBuilder (Batched)    │
            │   SingleRequestBuilder (<2000)    │
            │   BatchRequestBuilder  (>2000)    │
            └───────────────────────────────────┘
                            ↓
            ┌───────────────────────────────────┐
            │         Bitwarden API             │
            │      POST /import endpoint        │
            └───────────────────────────────────┘
```

### Code Organization

```
src/
├── abstractions/          # Interface definitions (IDirectoryService, etc.)
├── app/                   # Angular GUI components
│   ├── tabs/              # Tab-based navigation (Dashboard, Settings, More)
│   └── services/          # Angular service providers
├── commands/              # CLI command implementations
├── enums/                 # TypeScript enums (DirectoryType, etc.)
├── models/                # Data models (Entry, UserEntry, GroupEntry)
├── services/              # Business logic implementations
│   └── directory-services/  # One service per directory provider
├── bwdc.ts                # CLI entry point
├── main.ts                # Electron main process entry point
└── program.ts             # CLI command routing (Commander.js)

jslib/                     # Legacy shared libraries (do not add new code here)
utils/                     # Integration test fixtures
└── openldap/              # Docker configs, test data, certificates
```

### Key Principles

1. **Shared Service Layer**: GUI (Angular) and CLI share identical service implementations
2. **Factory Pattern**: `DirectoryFactoryService` instantiates the correct `IDirectoryService` based on `DirectoryType`
3. **Secure Storage**: Credentials stored in system keychain via `KeytarSecureStorageService`
4. **Delta Tracking**: Incremental sync via delta tokens to minimize API calls

### Core Patterns

#### Directory Service Pattern

**Purpose**: Abstract different identity providers behind a common interface

**Interface** (`src/abstractions/directory.service.ts`):

```typescript
export interface IDirectoryService {
  getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]>;
}
```

**Implementations** in `src/services/directory-services/`:

- `ldap-directory.service.ts` - LDAP/Active Directory
- `entra-id-directory.service.ts` - Microsoft Entra ID (Azure AD)
- `gsuite-directory.service.ts` - Google Workspace
- `okta-directory.service.ts` - Okta
- `onelogin-directory.service.ts` - OneLogin

**Factory** (`src/services/directory-factory.service.ts`):

```typescript
createService(type: DirectoryType): IDirectoryService
```

#### State Service Pattern

**Purpose**: Manage persistent state and credential storage

**Implementation** (`src/services/state.service.ts`):

- Configuration and sync settings stored in LowDB (JSON file)
- Sensitive data (passwords, API keys) stored in system keychain
- File locking via `proper-lockfile` to prevent concurrent access corruption
- Platform-specific app data directories:
  - macOS: `~/Library/Application Support/Bitwarden Directory Connector`
  - Windows: `%APPDATA%/Bitwarden Directory Connector`
  - Linux: `~/.config/Bitwarden Directory Connector` or `$XDG_CONFIG_HOME`

---

## Development Guide

### Adding a New Directory Service

**1. Create the enum value** (`src/enums/directoryType.ts`)

```typescript
export enum DirectoryType {
  Ldap = 0,
  EntraID = 1,
  GSuite = 2,
  Okta = 3,
  OneLogin = 4,
  NewProvider = 5, // Add here
}
```

**2. Create the configuration model** (`src/models/newProviderConfiguration.ts`)

```typescript
export class NewProviderConfiguration {
  apiUrl: string;
  apiToken: string;
  // Provider-specific settings
}
```

**3. Implement the directory service** (`src/services/directory-services/newprovider-directory.service.ts`)

```typescript
import { IDirectoryService } from "@/src/abstractions/directory.service";
import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";
import { BaseDirectoryService } from "./base-directory.service";

export class NewProviderDirectoryService extends BaseDirectoryService implements IDirectoryService {
  constructor(
    private logService: LogService,
    private i18nService: I18nService,
    private stateService: StateService,
  ) {
    super();
  }

  async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
    const config = await this.stateService.getDirectory<NewProviderConfiguration>(
      DirectoryType.NewProvider,
    );
    const syncConfig = await this.stateService.getSync();

    const groups: GroupEntry[] = [];
    const users: UserEntry[] = [];

    // Fetch from provider API
    // Apply filters using inherited filter methods

    return [groups, users];
  }
}
```

**4. Register in the factory** (`src/services/directory-factory.service.ts`)

```typescript
case DirectoryType.NewProvider:
  return new NewProviderDirectoryService(
    this.logService,
    this.i18nService,
    this.stateService
  );
```

**5. Add state service support** (`src/services/state.service.ts`)

```typescript
// Add to secure storage keys if credentials involved
// Add configuration getter/setter methods
```

**6. Write tests** (`src/services/directory-services/newprovider-directory.service.spec.ts`)

### Common Patterns

#### Error Handling with State Rollback

```typescript
async sync(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
  // Store initial state for rollback
  const startingUserDelta = await this.stateService.getUserDelta();
  const startingGroupDelta = await this.stateService.getGroupDelta();

  try {
    // Perform sync operations
    const [groups, users] = await this.directoryService.getEntries(force, test);
    // ... process and submit
    return [groups, users];
  } catch (e) {
    if (!test) {
      // Rollback deltas on failure
      await this.stateService.setUserDelta(startingUserDelta);
      await this.stateService.setGroupDelta(startingGroupDelta);
    }
    this.messagingService.send("dirSyncCompleted", { successfully: false });
    throw e;
  }
}
```

#### Filter Processing

```typescript
// In BaseDirectoryService
protected buildIncludeSet(filter: string): Set<string> {
  // Parse filter like "include:user1@example.com,user2@example.com"
}

protected buildExcludeSet(filter: string): Set<string> {
  // Parse filter like "exclude:user1@example.com"
}

protected shouldIncludeUser(user: UserEntry, include: Set<string>, exclude: Set<string>): boolean {
  if (exclude.has(user.email)) return false;
  if (include.size === 0) return true;
  return include.has(user.email);
}
```

### Running the Desktop GUI (Development)

```bash
npm install
npm run rebuild          # Rebuild native modules (keytar)
npm run electron         # Run GUI with hot reload
```

### Running the CLI (Development)

```bash
npm install
npm run build:cli:watch  # Build CLI with watch mode
node ./build-cli/bwdc.js --help  # Run CLI commands
```

---

## Data Models

### Core Types

```typescript
// Base entry class (src/models/entry.ts)
abstract class Entry {
  referenceId: string; // Unique ID within the directory (e.g., DN for LDAP)
  externalId: string; // ID used for Bitwarden import
}

// User entry (src/models/userEntry.ts)
class UserEntry extends Entry {
  email: string;
  disabled: boolean;
  deleted: boolean;
}

// Group entry (src/models/groupEntry.ts)
class GroupEntry extends Entry {
  name: string;
  userMemberExternalIds: Set<string>; // External IDs of member users
  groupMemberReferenceIds: Set<string>; // Reference IDs of nested groups
  users: UserEntry[]; // Populated for display/simulation
}
```

### Directory Type Enum

```typescript
// src/enums/directoryType.ts
enum DirectoryType {
  Ldap = 0,
  EntraID = 1,
  GSuite = 2,
  Okta = 3,
  OneLogin = 4,
}
```

### Configuration Models

Each directory provider has a configuration class in `src/models/`:

- `LdapConfiguration` - hostname, port, SSL/TLS, bind credentials, auth mode
- `EntraIdConfiguration` - tenant, client ID, secret key
- `GSuiteConfiguration` - domain, admin user, client email, private key
- `OktaConfiguration` - organization URL, API token
- `OneLoginConfiguration` - client ID, client secret, region

### Sync Configuration

```typescript
// src/models/syncConfiguration.ts
interface SyncConfiguration {
  users: boolean; // Sync users
  groups: boolean; // Sync groups
  interval: number; // Minutes between syncs (minimum 5)
  userFilter: string; // Include/exclude filter
  groupFilter: string; // Include/exclude filter
  removeDisabled: boolean; // Remove disabled users from org
  overwriteExisting: boolean; // Overwrite existing entries
  largeImport: boolean; // Enable for >2000 entries
  // LDAP-specific
  groupObjectClass: string;
  userObjectClass: string;
  groupPath: string;
  userPath: string;
  // ... additional LDAP attributes
}
```

---

## Security & Configuration

### Security Rules

**MANDATORY - These rules have no exceptions:**

1. **Never log credentials**: API keys, passwords, tokens, and secrets must never appear in logs
2. **Never hardcode secrets**: All URLs, credentials, and sensitive data must come from configuration
3. **Use KeytarSecureStorageService**: All credentials must be stored in the system keychain
4. **Validate external data**: Sanitize all data received from directory services
5. **LDAP injection prevention**: Be cautious with user-provided LDAP filters

### Secure Storage Keys

The following are stored in the system keychain (not plain JSON):

- `ldapPassword` - LDAP bind password
- `gsuitePrivateKey` - Google Workspace private key
- `entraKey` - Microsoft Entra ID client secret
- `oktaToken` - Okta API token
- `oneLoginClientSecret` - OneLogin client secret
- User/group delta tokens
- Sync hashes

### Environment Variables

| Variable                                   | Required | Description                              | Example              |
| ------------------------------------------ | -------- | ---------------------------------------- | -------------------- |
| `BITWARDENCLI_CONNECTOR_APPDATA_DIR`       | No       | CLI app data directory override          | `/custom/path`       |
| `BITWARDEN_CONNECTOR_APPDATA_DIR`          | No       | GUI app data directory override          | `/custom/path`       |
| `BITWARDENCLI_CONNECTOR_PLAINTEXT_SECRETS` | No       | Store secrets in plain text (debug only) | `true`               |
| `BITWARDENCLI_CONNECTOR_DEBUG`             | No       | Enable debug logging                     | `true`               |
| `BW_CLIENTID`                              | No       | CLI login client ID                      | `organization.xxxxx` |
| `BW_CLIENTSECRET`                          | No       | CLI login client secret                  | `xxxxx`              |
| `BW_NOINTERACTION`                         | No       | Disable interactive prompts              | `true`               |
| `BW_PRETTY`                                | No       | Pretty-print JSON output                 | `true`               |
| `BW_RAW`                                   | No       | Raw output (no formatting)               | `true`               |
| `BW_RESPONSE`                              | No       | JSON response format                     | `true`               |
| `BW_QUIET`                                 | No       | Suppress stdout                          | `true`               |

### Authentication & Authorization

- **API Token Authentication**: Uses organization `clientId` + `clientSecret`
- **Token Storage**: Access tokens and refresh tokens stored securely via Keytar
- **Token Refresh**: Automatic refresh when access token expires
- **Auth Service**: `src/services/auth.service.ts` handles the authentication flow

---

## Testing

### Test Structure

```
src/
├── services/
│   ├── sync.service.spec.ts              # Unit tests (colocated)
│   ├── sync.service.integration.spec.ts  # Integration tests
│   └── directory-services/
│       ├── ldap-directory.service.spec.ts
│       └── ldap-directory.service.integration.spec.ts
utils/
└── openldap/
    ├── config-fixtures.ts    # Test configuration helpers
    ├── user-fixtures.ts      # Expected user data
    ├── group-fixtures.ts     # Expected group data
    ├── certs/                # TLS certificates
    └── docker-compose.yml    # LDAP container config
```

### Writing Tests

**Unit Test Template**:

```typescript
import { mock, MockProxy } from "jest-mock-extended";

describe("ServiceName", () => {
  let logService: MockProxy<LogService>;
  let stateService: MockProxy<StateService>;
  let service: ServiceUnderTest;

  beforeEach(() => {
    logService = mock();
    stateService = mock();
    service = new ServiceUnderTest(logService, stateService);
  });

  it("should do something", async () => {
    // Arrange
    stateService.getSomeValue.mockResolvedValue(expectedValue);

    // Act
    const result = await service.doSomething();

    // Assert
    expect(result).toEqual(expectedResult);
  });
});
```

**Integration Test Template** (see `ldap-directory.service.integration.spec.ts`):

```typescript
// Requires Docker containers running
// npm run test:integration:setup

describe("ldapDirectoryService", () => {
  let stateService: MockProxy<StateService>;
  let directoryService: LdapDirectoryService;

  beforeEach(() => {
    stateService = mock();
    stateService.getDirectoryType.mockResolvedValue(DirectoryType.Ldap);
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());
  });

  it("syncs users and groups", async () => {
    const result = await directoryService.getEntries(true, true);
    expect(result).toEqual([groupFixtures, userFixtures]);
  });
});
```

### Running Tests

```bash
npm test                           # All unit tests (excludes integration)
npm test -- path/to/file.spec.ts   # Single test file
npm run test:watch                 # Watch mode

# Integration tests
npm run test:integration:setup     # Start Docker containers
npm run test:integration           # Run integration tests
npm run test:integration:watch     # Watch mode for integration
```

### Test Environment

- **Mocking**: `jest-mock-extended` with `mock<Type>()` for type-safe mocks
- **Alternative**: `@fluffy-spoon/substitute` available for some tests
- **Integration**: Docker containers for LDAP (OpenLDAP)
- **Fixtures**: Located in `utils/openldap/`

---

## Code Style & Standards

### Formatting

- **Prettier**: Auto-formatting enforced via pre-commit hooks
- **Config**: `.prettierrc` in project root

### Naming Conventions

- `camelCase` for: variables, functions, method names
- `PascalCase` for: classes, interfaces, types, enums
- `SCREAMING_SNAKE_CASE` for: constants (rare in this codebase)

### Imports

**Path Aliases:**

- `@/` maps to project root
- Example: `import { SyncService } from "@/src/services/sync.service"`

**Import Order (ESLint enforced):**

1. External packages (node_modules)
2. jslib imports (`@/jslib/...`)
3. Project imports (`@/src/...`)
4. Alphabetized within each group with newlines between groups

```typescript
// External
import { mock, MockProxy } from "jest-mock-extended";

// jslib
import { LogService } from "@/jslib/common/src/abstractions/log.service";

// Project
import { DirectoryType } from "@/src/enums/directoryType";
import { SyncService } from "@/src/services/sync.service";
```

### Comments

- Avoid unnecessary comments; code should be self-documenting
- Use JSDoc only for public APIs that need documentation
- Inline comments for complex logic only

### Pre-commit Hooks

- **Husky**: Runs `lint-staged` on commit
- **lint-staged**: Runs Prettier on all files, ESLint on TypeScript files

```bash
npm run lint             # Check ESLint + Prettier
npm run lint:fix         # Auto-fix ESLint issues
npm run prettier         # Auto-format with Prettier
npm run test:types       # TypeScript type checking
```

---

## Anti-Patterns

### DO

- ✅ Use `KeytarSecureStorageService` for all credential storage
- ✅ Implement `IDirectoryService` interface for new directory providers
- ✅ Use the factory pattern via `DirectoryFactoryService`
- ✅ Write unit tests with `jest-mock-extended` mocks
- ✅ Handle errors with state rollback (delta tokens)
- ✅ Use path aliases (`@/src/...`) for imports
- ✅ Validate data from external directory services
- ✅ Use `force` and `test` parameters consistently in sync methods

### DON'T

- ❌ Log credentials, API keys, or tokens
- ❌ Hardcode URLs, secrets, or configuration values
- ❌ Store sensitive data in LowDB (JSON) - use Keytar
- ❌ Skip input validation for LDAP filters (injection risk)
- ❌ Use `any` types without explicit justification
- ❌ Add new code to `jslib/` (legacy, read-only)
- ❌ Ignore delta token rollback on sync failure
- ❌ Bypass `overwriteExisting` validation for batch imports (>2000 entries)

---

## Deployment

### Building

**Desktop GUI (Electron):**

```bash
npm run build              # Build main + renderer
npm run build:dist         # Full distribution build
npm run dist:win           # Windows installer
npm run dist:mac           # macOS installer
npm run dist:lin           # Linux packages (AppImage, RPM)
```

**CLI Tool:**

```bash
npm run build:cli:prod     # Production build
npm run dist:cli:win       # Windows executable
npm run dist:cli:mac       # macOS executable
npm run dist:cli:lin       # Linux executable
```

### Versioning

Follow semantic versioning: `MAJOR.MINOR.PATCH`

- Version format: `YYYY.MM.PATCH` (e.g., `2025.12.0`)
- Managed in `package.json`

### Publishing

- **CI/CD**: GitHub Actions workflows in `.github/workflows/`
- **build.yml**: Multi-platform builds with code signing
- **release.yml**: Version bumping and publishing
- **Code Signing**: Azure Key Vault (Windows), App Store Connect (macOS)
- **Auto-update**: Electron Updater for GUI application

---

## Troubleshooting

### Common Issues

#### LDAP Connection Failures

**Problem**: Cannot connect to LDAP server, timeout or connection refused

**Solution**:

1. Verify hostname and port are correct
2. Check SSL/TLS settings match server configuration
3. For StartTLS, ensure SSL is enabled and use the non-secure port (389)
4. For LDAPS, use port 636 and provide CA certificate path

#### Keytar/Native Module Issues

**Problem**: `Error: Module did not self-register` or keytar-related crashes

**Solution**:

```bash
npm run rebuild    # Rebuild native modules for current Electron version
npm run reset      # Full reset of keytar module
```

#### Sync Hash Mismatch

**Problem**: Sync runs but no changes appear in Bitwarden

**Solution**: The sync service skips if the hash matches the previous sync. Use force sync:

```bash
bwdc sync --force   # CLI
# Or clear cache
bwdc clear-cache
```

#### Large Import Failures

**Problem**: Sync fails for organizations with >2000 users/groups

**Solution**: Enable `largeImport` in sync settings. Note: `overwriteExisting` is incompatible with batch mode.

### Debug Tips

- Enable debug logging: `BITWARDENCLI_CONNECTOR_DEBUG=true`
- View data file location: `bwdc data-file`
- Test sync without making changes: `bwdc test`
- Check last sync times: `bwdc last-sync users` / `bwdc last-sync groups`

---

## References

### Official Documentation

- [Directory Sync CLI Documentation](https://bitwarden.com/help/directory-sync-cli/)
- [Directory Connector Help](https://bitwarden.com/help/directory-sync/)

### Internal Documentation

- [Bitwarden Contributing Guidelines](https://contributing.bitwarden.com/contributing/)
- [Code Style Guide](https://contributing.bitwarden.com/contributing/code-style/)

### Tools & Libraries

- [ldapts](https://github.com/ldapts/ldapts) - LDAP client for Node.js
- [Keytar](https://github.com/atom/node-keytar) - Native keychain access
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [LowDB](https://github.com/typicode/lowdb) - JSON database
- [Microsoft Graph Client](https://github.com/microsoftgraph/msgraph-sdk-javascript) - Entra ID API
- [Google APIs](https://github.com/googleapis/google-api-nodejs-client) - GSuite API
