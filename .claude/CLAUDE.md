# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Bitwarden Directory Connector

## Project Overview

Directory Connector is a TypeScript application that synchronizes users and groups from directory services to Bitwarden organizations. It provides both a desktop GUI (built with Angular and Electron) and a CLI tool (bwdc).

**Supported Directory Services:**

- LDAP (Lightweight Directory Access Protocol) - includes Active Directory and general LDAP servers
- Microsoft Entra ID (formerly Azure Active Directory)
- Google Workspace
- Okta
- OneLogin

**Technologies:**

- TypeScript
- Angular (GUI)
- Electron (Desktop wrapper)
- Node
- Jest for testing

### Current Project Status

**Mission Critical but Deprioritized:** Directory Connector is used to sync customer directory services with their Bitwarden organization. While SCIM is the more modern cloud-hosted solution, not all directory services support SCIM, and SCIM is only available on Enterprise plans. Therefore, DC remains mission-critical infrastructure for many paying customers, but it's deprioritized in the codebase due to infrequent changes.

**Isolated Repository:** Unlike other Bitwarden client applications that live in a monorepo with shared core libraries, Directory Connector was kept separate when other TypeScript clients moved to the monorepo. It got its own copy of the jslib repo to avoid unnecessary regressions from apparently unrelated code changes in other clients. This severed it from the rest of the codebase, causing:

- Outdated dependencies that can't be updated (ES modules vs CommonJS conflicts)
- File/folder structure that doesn't match modern Bitwarden client patterns
- Accumulated technical debt requiring significant investment to pay down
- jslib contains unused code from all clients, but cannot be deleted due to monolithic/tightly coupled architecture

**Critical Issues (Current Status):**

- ✅ ~~Electron, Node, and Angular are on unmaintained versions~~ **RESOLVED** - All updated (Electron 39, Node 20, Angular 21, TypeScript 5.9)
- ❌ `keytar` is archived (Dec 2022) and incompatible with Node v22, **blocking Node upgrades beyond v20** - **PRIMARY BLOCKER**
- ❌ No ESM support blocks dependency upgrades: googleapis, lowdb, chalk, inquirer, node-fetch, electron-store
- ⚠️ 70 dev dependencies + 31 runtime dependencies = excessive maintenance burden (count increased with Angular 21 tooling)
- ❌ StateService is a large pre-StateProvider monolith containing every getter/setter for all clients (PM-31159 In Progress)
- ✅ ~~Angular CLI not used~~ **RESOLVED** - Angular CLI 21.1.2 now integrated with angular.json configuration

**Development Approach:** When working on this codebase, prioritize sustainability and maintainability over adding new features. Consider how changes will affect long-term maintenance burden.

## Tech Debt Roadmap

### Progress Summary

**Completed:**

- ✅ Phase 0 (Immediate Priority): All major dependencies upgraded (Node 20, Angular 21, TypeScript 5.9, Electron 39)
- ✅ Phase 6: Angular CLI integration complete

**In Progress:**

- 🔄 Phase 1: StateService rewrite (PM-31159)

**Blocked/Todo:**

- ❌ Phase 2: Remove remaining jslib code (blocked by Phase 1)
- ❌ Phase 3: Repository restructure (should be done before Phase 5)
- ⚠️ Phase 4: Replace Keytar **[CRITICAL BLOCKER]** - blocking Node v22+ upgrades
- ❌ Phase 5: ESM Support (blocked by Phase 3, needed for googleapis, lowdb, chalk, inquirer, etc.)

**Primary Blocker:** Keytar removal (Phase 4) is the most critical task as it blocks Node upgrades beyond v20.

---

### ✅ Immediate Priority: Unsupported Dependencies (COMPLETED)

**Upgrade Path (July 2025 release) - STATUS: COMPLETE**

All major version upgrades have been completed and exceeded targets:

1. ✅ Node 18.20.8 → 20.18 → **COMPLETE** (engines: `~20`, .nvmrc: `v20`)
2. ✅ Angular 17 → 18.2.x → **EXCEEDED** (now at **21.1.1**)
3. ✅ TypeScript 5.4.5 → 5.6.0 → **EXCEEDED** (now at **5.9.3**)
4. ✅ Electron 34 → 36 → **EXCEEDED** (now at **39.2.1**)
5. ✅ Angular matches clients monorepo version (21.x)

**Current Versions:**

- Node: v20 (project target), blocked from v22+ by keytar
- TypeScript: 5.9.3
- Angular: 21.1.1 (all packages)
- Electron: 39.2.1 (well beyond EOL target of 36)
- @yao-pkg/pkg: 5.16.1 (community fork replacing archived pkg)

**Note:** Further Node upgrades to v22+ are **blocked by keytar** (see Phase 4). Electron 36 was EOL October 2028, but we're already on 39.2.1.

### Phase 1: StateService Rewrite (PM-31159, In Progress)

**Problem:** StateService is a post-account-switching, pre-StateProvider monolith containing every getter/setter for all clients. This prevents deletion of unused data models and code. Never very stable, and more complex than DC needs (DC doesn't need account switching).

**Current Status:** 🔄 **Active PR** - [#990](https://github.com/bitwarden/directory-connector/pull/990) (Open, Author: @BTreston)

- PR created: Feb 2, 2026
- Last updated: Feb 5, 2026
- Files changed: 17 files (+1,512, -41 lines)
- Commits: 4 (scaffold, add tests, fix type issues, fix integration test)

**Implementation Details:**

**New Architecture:**

- Created `StateServiceVNext` interface (`src/abstractions/state-vNext.service.ts`)
- New implementation: `StateServiceVNextImplementation` (`src/services/state-service/state-vNext.service.ts`)
- New state model with flat key-value structure (`src/models/state.model.ts`)
- Comprehensive test suite: `state-vNext.service.spec.ts` (488 lines of tests)

**Storage Key Structure:**

```typescript
// vNext Storage Keys (Flat key-value structure)
StorageKeysVNext = {
  stateVersion: "stateVersion",
  directoryType: "directoryType",
  organizationId: "organizationId",
  directory_ldap: "directory_ldap",
  directory_gsuite: "directory_gsuite",
  directory_entra: "directory_entra",
  directory_okta: "directory_okta",
  directory_onelogin: "directory_onelogin",
  sync: "sync",
  syncingDir: "syncingDir",
};

// Secure storage keys for sensitive data
SecureStorageKeysVNext = {
  ldap: "secret_ldap",
  gsuite: "secret_gsuite",
  azure: "secret_azure", // Backwards compatible with old name
  entra: "secret_entra",
  okta: "secret_okta",
  oneLogin: "secret_oneLogin",
  userDelta: "userDeltaToken",
  groupDelta: "groupDeltaToken",
  lastUserSync: "lastUserSync",
  lastGroupSync: "lastGroupSync",
  lastSyncHash: "lastSyncHash",
};
```

**Migration Strategy:**

- State version bumped to `StateVersion.Five` (`jslib/common/src/enums/stateVersion.ts`)
- Enhanced `StateMigrationService` to handle migration from old account-based structure to new flat structure
- Migration keys defined for backwards compatibility (`MigrationKeys`, `SecureStorageKeysMigration`)
- Temporary keys used during migration (`TempKeys`) to preserve data during transition

**File Organization:**

- State-related files moved to `src/services/state-service/` subdirectory:
  - `state-vNext.service.ts` (new implementation)
  - `state-vNext.service.spec.ts` (488 lines of tests)
  - `state.service.ts` (legacy, moved from `src/services/`)
  - `stateMigration.service.ts` (enhanced for v5 migration)
- New abstraction: `src/abstractions/state-vNext.service.ts`
- New model: `src/models/state.model.ts` (defines all storage keys)

**Integration:**

- Both old `StateService` and new `StateServiceVNext` injected in parallel during migration phase
- `DirectoryFactoryService` updated to accept both services
- Services module provides both implementations
- CLI (`bwdc.ts`) and GUI (`main.ts`) both instantiate new service alongside old one

**Chosen Approach Benefits:**

- Clean break with old StateService - high degree of certainty
- Simple and focused on DC's needs (no account switching, no rxjs)
- Flat key-value structure easier to maintain
- Versioning and migration capabilities included
- Keeps existing data.json around during transition
- All getters/setters in one place (acceptable for small application)

**Rejected Approaches:**

- Copy StateProvider from clients: Too complex (supports account switching, rxjs, syncing background/foreground contexts)
- Rewrite simplified StateService keeping current data structure: Commits us to previous decisions, keeps monolithic account objects

**Next Steps:**

- Complete PR review and merge
- Monitor for regressions during initial rollout
- After several releases, can remove old StateService and migration code
- Begin Phase 2: Remove remaining jslib code that was only needed by old StateService

### Phase 2: Remove Remaining jslib Code

After StateService is removed, review and delete old models and remaining services that referenced each other. jslib contains unused code from all clients that DC doesn't need.

### Phase 3: Restructure Repository (PM-31852, To Do)

**Current Structure:**

```
src/          # Both Electron and CLI app code
src-cli/      # package.json entry point for CLI only, no code
jslib/
  ├── common/    # Shared common code
  ├── node/      # Node specific code used in CLI
  └── electron/  # Electron specific code used in GUI
```

**Target Structure:**

```
src-gui/      # Electron specific code only (combining src (partial) + jslib/electron)
src-cli/      # Node and CLI specific code only (combining src (partial) + jslib/node)
libs/         # Shared app-independent DC code, e.g. sync services (combining src (partial) + jslib/common)
```

**Why:** Makes subsequent changes (code reorganizing, ESM support) much easier. This should be done early in the modernization process.

### Phase 4: Replace Keytar (PM-12436, To Do) ⚠️ **CRITICAL BLOCKER**

**Problem:** `keytar` (OS secure storage for secrets) was archived December 2022 and is incompatible with Node v22, **actively blocking Node upgrades beyond v20**.

**Current Status:**

- `keytar`: **7.9.0** (still present in dependencies)
- **This is the #1 blocker preventing Node v22+ upgrades**
- All "Immediate Priority" dependencies have been upgraded, but further progress requires removing keytar

**Solution:** Migrate to Bitwarden's Rust implementation in `desktop_native` (same as clients monorepo did)

1. Implement Rust <-> NAPI integration (like `desktop_native/napi`) from Electron app to Rust code
2. Copy, rename, and expose necessary functions
3. Point to `desktop_native` crate using git link from DC repo (no need for SDK yet):
   ```rust
   desktop_core = { git = "https://github.com/bitwarden/clients", rev = "00cf24972d944638bbd1adc00a0ae3eeabb6eb9a" }
   ```

**Important:** `keytar` uses wrong encoding on Windows (UTF-8 instead of UTF-16). Bitwarden uses UTF-16. Code should contain a migration - ensure old values are migrated correctly during testing.

**Priority:** This should be prioritized as it's blocking the Node upgrade path and has been archived for over 2 years.

### Phase 5: Add ESM Support (PM-31850, To Do)

**Problem:** No ESM module support prevents upgrading key dependencies.

**Blocked Dependencies (Current Status):**

- ❌ `googleapis`: **149.0.0** → current (major dependency, disabled in renovate.json5)
- ❌ `lowdb`: **1.0.0** → v7
- ❌ `@types/lowdb`: **1.0.15** (can be deleted once inquirer is upgraded)
- ❌ `@electron/notarize`: **2.5.0** → v3.0.1
- ❌ `chalk`: **4.1.2** → v5.3.0
- ❌ `inquirer`: **8.2.6** → v12.1.0
- ❌ `@types/inquirer`: **8.2.10** (should be deleted when inquirer upgraded)
- ❌ `node-fetch`: **2.7.0** → v3.3.2 (should use native Node fetch API when on Node >=21)
- ❌ `electron-store`: **8.2.0** → v10.1.0

**Status:** These dependencies remain blocked as expected. They will stay on old versions until:

1. Phase 3 (Repository Restructure) is complete
2. ESM support is implemented
3. Note: These ESM dependencies are primarily used in CLI build, so restructuring first (Phase 3) will limit the impact of ESM migration.

**Implementation:**

1. Update tsconfig.json and package.json configurations
2. Update import/export syntax to no longer use `require` statements
3. Upgrade dependencies to move away from CommonJS (ESM can import CommonJS, but not vice versa)
4. Trial and error

**Reference:** [Pure ESM package guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)

### Phase 6: Add Angular CLI (PM-31849, In Progress / Possibly Complete?)

**Problem:** Angular CLI provides great DX and makes it easier to manage Angular changes (e.g. auto-migrations). DC didn't use it.

**Current Status:**

- ✅ `@angular/cli`: **21.1.2** is now present in **runtime dependencies**
- ✅ `@angular/build`: **21.1.2** is present in dev dependencies
- ✅ All Angular tooling has been updated to v21.x

**Status:** ✅ **COMPLETE** - Angular CLI has been successfully integrated:

- `angular.json` configuration file exists
- `.angular/` cache directory present
- `@angular/cli` 21.1.2 in runtime dependencies
- `@angular/build` 21.1.2 in dev dependencies
- All Angular packages updated to v21.x

This migration provides improved DX and access to Angular's auto-migration tools for future updates.

### Additional Considerations

**Reduce Dependency Count:** Current state is 70 dev dependencies + 31 runtime dependencies (101 total). The dev dependency count increased from the original 66 due to Angular 21 upgrade adding additional tooling. After removing old code, review dependency list:

- Can we remove some after code cleanup?
- Could we reintegrate with monorepo to leverage Component Library and shared platform dependencies?
  - **Risk:** Becomes tightly coupled with monorepo code → regression risk, move slower due to coupling

**GitHub Workflows:** Need review and modernization:

- PM-20478: Add check-run workflow for CI on community PRs
- PM-18290: Add linting workflow
- PM-18289: Update build workflow
- `pkg` and `pkg-fetch` for packaging Node runtime in CLI release are archived (fork exists but untrusted; clients vets all changes manually)
  - Options: Make our own fork, or use Node's single executable binary support (investigate)

## Common Development Commands

### Desktop App (Electron + Angular)

**Initial Setup:**

```bash
npm install              # Install dependencies (runs git submodule init automatically)
npm run rebuild          # Rebuild native modules for Electron
```

**Development:**

```bash
npm run electron         # Build and run desktop app with hot reload and debugging
npm run electron:ignore  # Same as above but ignores certificate errors
```

**Building:**

```bash
npm run build            # Build both main and renderer processes
npm run build:main       # Build Electron main process only
npm run build:renderer   # Build Angular renderer process only
npm run build:renderer:watch  # Build renderer with file watching
```

**Distribution:**

```bash
npm run dist:mac         # Create macOS distributable
npm run dist:win         # Create Windows distributable
npm run dist:lin         # Create Linux distributable
```

### CLI (bwdc)

**Development:**

```bash
npm run build:cli:watch  # Build CLI with file watching
node ./build-cli/bwdc.js --help  # Run the CLI from build output
```

**Production Build:**

```bash
npm run build:cli:prod   # Build CLI for production
npm run dist:cli         # Create platform-specific CLI executables (all platforms)
npm run dist:cli:mac     # Create macOS CLI executable only
npm run dist:cli:win     # Create Windows CLI executable only
npm run dist:cli:lin     # Create Linux CLI executable only
```

### Testing

**Unit Tests:**

```bash
npm test                 # Run unit tests (excludes integration tests)
npm run test:watch       # Run unit tests in watch mode
npm run test:watch:all   # Run unit tests in watch mode (all files)
npm run test:types       # Run TypeScript type checking without emitting files
```

**Integration Tests:**

```bash
npm run test:integration:setup  # Set up Docker containers for LDAP testing
npm run test:integration        # Run integration tests
npm run test:integration:watch  # Run integration tests in watch mode
```

Integration tests require Docker and test against live directory services. The setup command creates OpenLDAP containers using docker-compose.yml.

### Linting & Formatting

```bash
npm run lint             # Run ESLint and Prettier checks
npm run lint:fix         # Auto-fix ESLint issues
npm run prettier         # Format all files with Prettier
```

### Submodule Management

The `jslib` folder is a git submodule containing shared Bitwarden libraries:

```bash
npm run sub:update       # Update submodule to latest remote version
npm run sub:pull         # Pull latest changes in submodule
npm run sub:commit       # Pull and commit submodule update
```

### Utility Commands

```bash
npm run reset            # Remove keytar modules and reinstall (use when switching between CLI/desktop)
npm run clean:dist       # Clean desktop distribution files
npm run clean:dist:cli   # Clean CLI distribution files
```

**Important:** When switching between developing the desktop app and CLI, run `npm run reset` to avoid native module conflicts.

## Code Architecture & Structure

### Directory Organization

```
src/
├── abstractions/       # Interface definitions (e.g., IDirectoryService)
├── services/          # Business logic implementations for directory services, sync, auth
├── models/            # Data models (UserEntry, GroupEntry, etc.)
├── commands/          # CLI command implementations
├── app/               # Angular GUI components
└── utils/             # Test utilities and fixtures

src-cli/               # CLI-specific code (imports common code from src/)

jslib/                 # Legacy folder structure (mix of deprecated/unused and current code - new code should not be added here)
```

### Key Architectural Patterns

1. **Abstractions = Interfaces**: All interfaces are defined in `/abstractions`
2. **Services = Business Logic**: Implementations live in `/services`
3. **Directory Service Pattern**: Each directory provider implements `IDirectoryService` interface
4. **Separation of Concerns**: GUI (Angular app) and CLI (commands) share the same service layer

### Core Synchronization Flow

The sync process follows this pattern:

1. **DirectoryFactoryService** (`src/services/directory-factory.service.ts`) - Creates the appropriate directory service based on DirectoryType configuration
2. **IDirectoryService** implementation (`src/services/directory-services/*.service.ts`) - Each provider (LDAP, Entra ID, Google, Okta, OneLogin) implements:
   - `getEntries(force, test)` - Returns `[GroupEntry[], UserEntry[]]`
   - Provider-specific authentication and API calls
3. **SyncService** (`src/services/sync.service.ts`) - Orchestrates the sync:
   - Calls directory service to get entries
   - Filters and deduplicates users/groups
   - Uses BatchRequestBuilder or SingleRequestBuilder to format API requests
   - Generates hash to detect changes and avoid redundant syncs
   - Sends data to Bitwarden API via ApiService
4. **Request Builders** (`src/services/*-request-builder.ts`) - Transform directory entries into Bitwarden API format

### Shared Library (jslib)

The `jslib` folder is a git submodule containing shared Bitwarden code:

- Common services (API, Crypto, Storage, Auth)
- Platform utilities
- Shared models and abstractions

**Important:** This is legacy structure - do not add new code to jslib. New code should go in `src/`.

## Development Conventions

### Code Organization

**File Naming:**

- kebab-case for files: `ldap-directory.service.ts`
- Descriptive names that reflect purpose

**Class/Function Naming:**

- PascalCase for classes and interfaces
- camelCase for functions and variables
- Descriptive names that indicate purpose

**File Structure:**

- Keep files focused on single responsibility
- Create new service files for distinct directory integrations
- Separate models into individual files when complex

### TypeScript Conventions

**Import Patterns:**

- Use path aliases (`@/`) for project imports
  - `@/` - project root
  - `@/jslib/` - jslib folder
- ESLint enforces alphabetized import ordering with newlines between groups

**Type Safety:**

- Avoid `any` types - use proper typing or `unknown` with type guards
- Prefer interfaces for contracts, types for unions/intersections
- Use strict null checks - handle `null` and `undefined` explicitly
- Leverage TypeScript's type inference where appropriate

**Configuration:**

- Use configuration files or environment variables
- Never hardcode URLs or configuration values

## Security Best Practices

**Credential Handling:**

- Never log directory service credentials, API keys, or tokens
- Use secure storage mechanisms for sensitive data
- Credentials should never be hardcoded
- Store credentials encrypted, never in plain text

**Sensitive Data:**

- User and group data from directories should be handled securely
- Avoid exposing sensitive information in error messages
- Sanitize data before logging
- Be cautious with data persistence

**Input Validation:**

- Validate and sanitize data from external directory services
- Check for injection vulnerabilities (LDAP injection, etc.)
- Validate configuration inputs from users

**API Security:**

- Ensure authentication flows are implemented correctly
- Verify SSL/TLS is used for all external connections
- Check for secure token storage and refresh mechanisms

## Error Handling

**Best Practices:**

1. **Try-catch for async operations** - Always wrap external API calls
2. **Meaningful error messages** - Provide context for debugging
3. **Error propagation** - Don't swallow errors silently
4. **User-facing errors** - Separate user messages from developer logs

## Performance Best Practices

**Large Dataset Handling:**

- Use pagination for large user/group lists
- Avoid loading entire datasets into memory at once
- Consider streaming or batch processing for large operations

**API Rate Limiting:**

- Respect rate limits for Microsoft Graph API, Google Admin SDK, etc.
- Consider batching large API calls where necessary

**Memory Management:**

- Close connections and clean up resources
- Remove event listeners when components are destroyed
- Be cautious with caching large datasets

## Testing

**Framework:**

- Jest with jest-preset-angular
- jest-mock-extended for type-safe mocks with `mock<Type>()`

**Test Organization:**

- Tests colocated with source files
- `*.spec.ts` - Unit tests for individual components/services
- `*.integration.spec.ts` - Integration tests against live directory services
- Test helpers located in `utils/` directory

**Test Naming:**

- Descriptive, human-readable test names
- Example: `'should return empty array when no users exist in directory'`

**Test Coverage:**

- New features must include tests
- Bug fixes should include regression tests
- Changes to core sync logic or directory specific logic require integration tests

**Testing Approach:**

- **Unit tests**: Mock external API calls using jest-mock-extended
- **Integration tests**: Use live directory services (Docker containers or configured cloud services)
- Focus on critical paths (authentication, sync, data transformation)
- Test error scenarios and edge cases (empty results, malformed data, connection failures), not just happy paths

## Directory Service Patterns

### IDirectoryService Interface

All directory services implement this core interface with methods:

- `getUsers()` - Retrieve users from directory and transform them into standard objects
- `getGroups()` - Retrieve groups from directory and transform them into standard objects
- Connection and authentication handling

### Service-Specific Implementations

Each directory service has unique authentication and query patterns:

- **LDAP**: Direct LDAP queries, bind authentication
- **Microsoft Entra ID**: Microsoft Graph API, OAuth tokens
- **Google Workspace**: Google Admin SDK, service account credentials
- **Okta/OneLogin**: REST APIs with API tokens

## References

- [Architectural Decision Records (ADRs)](https://contributing.bitwarden.com/architecture/adr/)
- [Contributing Guidelines](https://contributing.bitwarden.com/contributing/)
- [Code Style](https://contributing.bitwarden.com/contributing/code-style/)
- [Security Whitepaper](https://bitwarden.com/help/bitwarden-security-white-paper/)
- [Security Definitions](https://contributing.bitwarden.com/architecture/security/definitions)
