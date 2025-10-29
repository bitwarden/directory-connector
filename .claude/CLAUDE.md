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

## Testing Conventions

- **Framework**: Jest with jest-preset-angular
- **Mocking**: jest-mock-extended for type-safe mocks with `mock<Type>()`
- **Location**: Tests colocated with source files
- **Naming**: Descriptive, human-readable test names (e.g., `'should return empty array when no users exist in directory'`)
- **Test Helpers**: Located in `utils/` directory

## Directory Integration Patterns

### IDirectoryService Interface

All directory services implement this core interface with methods:

- `getUsers()` - Retrieve users from directory
- `getGroups()` - Retrieve groups from directory
- Connection and authentication handling

### Service-Specific Implementations

Each directory service has unique authentication and query patterns:

- **LDAP**: Direct LDAP queries, bind authentication
- **Microsoft Entra ID**: Microsoft Graph API, OAuth tokens
- **Google Workspace**: Google Admin SDK, service account credentials
- **Okta/OneLogin**: REST APIs with API tokens

## Code Review Guidelines

### Security Considerations

**Critical Security Areas:**

1. **Credential Handling**
   - Never log directory service credentials, API keys, or tokens
   - Use secure storage mechanisms for sensitive data
   - Credentials should never be hardcoded

2. **Sensitive Data**
   - User and group data from directories should be handled securely
   - Avoid exposing sensitive information in error messages
   - Sanitize data before logging
   - Be cautious with data persistence

3. **Input Validation**
   - Validate and sanitize data from external directory services
   - Check for injection vulnerabilities (LDAP injection, etc.)
   - Validate configuration inputs from users

4. **API Security**
   - Ensure OAuth flows are implemented correctly
   - Verify SSL/TLS is used for all external connections
   - Check for secure token storage and refresh mechanisms

### TypeScript Conventions

**Import patterns**

- Use path aliases (`@/`) for project imports
  - `@/` - project root
  - `@/jslib/` - jslib folder
- ESLint enforces alphabetized import ordering with newlines between groups

**Type Safety:**

- Avoid `any` types - use proper typing or `unknown` with type guards
- Prefer interfaces for contracts, types for unions/intersections
- Use strict null checks - handle `null` and `undefined` explicitly
- Leverage TypeScript's type inference where appropriate

**Async Patterns:**

```typescript
// Good - proper async/await with error handling
async function syncUsers(): Promise<UserEntry[]> {
  try {
    const users = await directoryService.getUsers();
    return users.filter((u) => u.enabled);
  } catch (error) {
    logger.error("Failed to sync users", error);
    throw new SyncError("User sync failed", error);
  }
}

// Avoid - unhandled promises
function syncUsers() {
  directoryService.getUsers().then((users) => processUsers(users));
}
```

### Error Handling Patterns

**Required Practices:**

1. **Try-catch for async operations** - Always wrap external API calls
2. **Meaningful error messages** - Provide context for debugging
3. **Error propagation** - Don't swallow errors silently
4. **User-facing errors** - Separate user messages from developer logs

```typescript
// Good
try {
  await directoryService.connect();
} catch (error) {
  logger.error("Directory connection failed", { service: "ldap", error });
  throw new ConnectionError("Unable to connect to directory service", error);
}

// Avoid - swallowing errors
try {
  await directoryService.connect();
} catch (error) {
  console.log("error"); // Too vague, no context
}
```

### Performance Considerations

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

### Testing Requirements

**Test File Types:**

- `*.spec.ts` - Unit tests for individual components/services
- `*.integration.spec.ts` - Integration tests against live directory services

**When Tests Are Required:**

- New features must include tests
- Bug fixes should include regression tests
- Changes to core sync logic or directory specific logic require integration tests

**Test Expectations:**

- **Unit tests**: Mock external API calls using jest-mock-extended
- **Integration tests**: Use live directory services (Docker containers or configured cloud services)
- **Coverage focus**: Critical paths (authentication, sync, data transformation)
- **Test scenarios**: Error cases and edge cases (empty results, malformed data, connection failures), not just happy paths

### Common Anti-Patterns to Flag

1. **Hardcoded Values**
   - No hardcoded credentials, URLs, or configuration
   - Use configuration files or environment variables

2. **Synchronous Operations**
   - Don't use sync file operations in production code
   - Avoid blocking operations in main thread

3. **Missing Error Handling**
   - Every external call should have error handling
   - API calls, file operations, and network requests must be wrapped

4. **Memory Leaks**
   - Unclosed connections to directory services
   - Event listeners not removed
   - Large objects not released

5. **Insecure Patterns**
   - Logging sensitive data
   - Storing credentials in plain text
   - Missing input validation

6. **Poor Performance Patterns**
   - Loading entire directory into memory
   - N+1 query patterns
   - Inefficient loops with repeated operations

### Code Organization Standards

**File Naming:**

- kebab-case for files: `ldap-directory.service.ts`
- Descriptive names that reflect purpose

**Class/Function Naming:**

- PascalCase for classes and interfaces
- camelCase for functions and variables
- Descriptive names that indicate purpose

**When to Create New Files:**

- Keep files focused on single responsibility
- Create new service files for distinct directory integrations
- Separate models into individual files when complex

## References

- [Architectural Decision Records (ADRs)](https://contributing.bitwarden.com/architecture/adr/)
- [Contributing Guidelines](https://contributing.bitwarden.com/contributing/)
- [Code Style](https://contributing.bitwarden.com/contributing/code-style/)
- [Security Whitepaper](https://bitwarden.com/help/bitwarden-security-white-paper/)
- [Security Definitions](https://contributing.bitwarden.com/architecture/security/definitions)
