# Google Workspace Directory Integration

This document provides technical documentation for the Google Workspace (formerly G Suite) directory integration in Bitwarden Directory Connector.

## Overview

The Google Workspace integration synchronizes users and groups from Google Workspace to Bitwarden organizations using the Google Admin SDK Directory API. The service uses a service account with domain-wide delegation to authenticate and access directory data.

## Architecture

### Service Location

- **Implementation**: `src/services/directory-services/gsuite-directory.service.ts`
- **Configuration Model**: `src/models/gsuiteConfiguration.ts`
- **Integration Tests**: `src/services/directory-services/gsuite-directory.service.integration.spec.ts`

### Authentication Flow

The Google Workspace integration uses **OAuth 2.0 with Service Accounts** and domain-wide delegation:

1. A service account is created in Google Cloud Console
2. The service account is granted domain-wide delegation authority
3. The service account is authorized for specific OAuth scopes in Google Workspace Admin Console
4. The Directory Connector uses the service account's private key to generate JWT tokens
5. JWT tokens are exchanged for access tokens to call the Admin SDK APIs

### Required OAuth Scopes

The service account must be granted the following OAuth 2.0 scopes:

```
https://www.googleapis.com/auth/admin.directory.user.readonly
https://www.googleapis.com/auth/admin.directory.group.readonly
https://www.googleapis.com/auth/admin.directory.group.member.readonly
```

## Configuration

### Required Fields

| Field         | Description                                                                             |
| ------------- | --------------------------------------------------------------------------------------- |
| `clientEmail` | Service account email address (e.g., `service-account@project.iam.gserviceaccount.com`) |
| `privateKey`  | Service account private key in PEM format                                               |
| `adminUser`   | Admin user email to impersonate for domain-wide delegation                              |
| `domain`      | Primary domain of the Google Workspace organization                                     |

### Optional Fields

| Field      | Description                                                |
| ---------- | ---------------------------------------------------------- |
| `customer` | Customer ID for multi-domain organizations (rarely needed) |

### Example Configuration

```typescript
{
  clientEmail: "directory-connector@my-project.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  adminUser: "admin@example.com",
  domain: "example.com",
  customer: "" // Usually not required
}
```

## Setup Instructions

### 1. Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Enter a name and description
6. Click **Create and Continue**
7. Skip granting roles (not needed for this use case)
8. Click **Done**

### 2. Generate Service Account Key

1. Click on the newly created service account
2. Navigate to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Click **Create** and download the key file
6. Extract `client_email` and `private_key` from the JSON file

### 3. Enable Domain-Wide Delegation

1. In the service account details, click **Show Advanced Settings**
2. Under **Domain-wide delegation**, click **Enable Google Workspace Domain-wide Delegation**
3. Note the **Client ID** (numeric ID)

### 4. Authorize the Service Account in Google Workspace

1. Go to [Google Workspace Admin Console](https://admin.google.com)
2. Navigate to **Security** > **API Controls** > **Domain-wide Delegation**
3. Click **Add new**
4. Enter the **Client ID** from step 3
5. Enter the following OAuth scopes (comma-separated):
   ```
   https://www.googleapis.com/auth/admin.directory.user.readonly,
   https://www.googleapis.com/auth/admin.directory.group.readonly,
   https://www.googleapis.com/auth/admin.directory.group.member.readonly
   ```
6. Click **Authorize**

### 5. Configure Directory Connector

Use the extracted values to configure the Directory Connector:

- **Client Email**: From `client_email` in the JSON key file
- **Private Key**: From `private_key` in the JSON key file (keep the `\n` line breaks)
- **Admin User**: Email of a super admin user in your Google Workspace domain
- **Domain**: Your primary Google Workspace domain

## Sync Behavior

### User Synchronization

The service synchronizes the following user attributes:

| Google Workspace Field    | Bitwarden Field             | Notes                                     |
| ------------------------- | --------------------------- | ----------------------------------------- |
| `id`                      | `referenceId`, `externalId` | User's unique Google ID                   |
| `primaryEmail`            | `email`                     | Normalized to lowercase                   |
| `suspended` OR `archived` | `disabled`                  | User is disabled if suspended or archived |
| Deleted status            | `deleted`                   | Set to true for deleted users             |

**Special Behavior:**

- The service queries both **active users** and **deleted users** separately
- Suspended and archived users are included but marked as disabled
- Deleted users are included with the `deleted` flag set to true

### Group Synchronization

The service synchronizes the following group attributes:

| Google Workspace Field  | Bitwarden Field             | Notes                    |
| ----------------------- | --------------------------- | ------------------------ |
| `id`                    | `referenceId`, `externalId` | Group's unique Google ID |
| `name`                  | `name`                      | Group display name       |
| Members (type=USER)     | `userMemberExternalIds`     | Individual user members  |
| Members (type=GROUP)    | `groupMemberReferenceIds`   | Nested group members     |
| Members (type=CUSTOMER) | `userMemberExternalIds`     | All domain users         |

**Member Types:**

- **USER**: Individual user accounts (only ACTIVE status users are synced)
- **GROUP**: Nested groups (allows group hierarchy)
- **CUSTOMER**: Special member type that includes all users in the domain

### Filtering

#### User Filter Examples

```
exclude:testuser1@bwrox.dev | testuser1@bwrox.dev                   # Exclude multiple users
|orgUnitPath='/Integration testing'                                 # Users in Integration testing Organizational unit (OU)
exclude:testuser1@bwrox.dev | orgUnitPath='/Integration testing'    # Combined filter: get users in OU excluding provided user
|email:testuser*                                                    # Users with email starting with "testuser"
```

#### Group Filter Examples

An important note for group filters is that it implicitly only syncs users that are in groups. For example, in the case of
the integration test data, `admin@bwrox.dev` is not a member of any group. Therefore, the first example filter below will
also implicitly exclude `admin@bwrox.dev`, who is not in any group. This is important because when it is paired with an
empty user filter, this query may semantically be understood as "sync everyone not in Integration Test Group A," while in
practice it means "Only sync members of groups not in integration Test Groups A."

```
exclude:Integration Test Group A                                    # Get all users in groups excluding the provided group.
```

### User AND Group Filter Examples

```

```

**Filter Syntax:**

- Prefix with `|` for custom filters
- Use `:` for pattern matching (supports `*` wildcard)
- Combine multiple conditions with spaces (AND logic)

### Pagination

The service automatically handles pagination for all API calls:

- Users API (active and deleted)
- Groups API
- Group Members API

Each API call processes all pages using the `nextPageToken` mechanism until no more results are available.

## Error Handling

### Common Errors

| Error                  | Cause                                 | Resolution                                                 |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------- |
| "dirConfigIncomplete"  | Missing required configuration fields | Verify all required fields are provided                    |
| "authenticationFailed" | Invalid credentials or unauthorized   | Check service account key and domain-wide delegation setup |
| API returns 401/403    | Missing OAuth scopes                  | Verify scopes are authorized in Admin Console              |
| API returns 404        | Invalid domain or customer ID         | Check domain configuration                                 |

### Security Considerations

The service implements the following security measures:

1. **Credential sanitization**: Error messages do not expose private keys or sensitive credentials
2. **Secure authentication**: Uses OAuth 2.0 with JWT tokens, not API keys
3. **Read-only access**: Only requires read-only scopes for directory data
4. **No credential logging**: Service account credentials are not logged

## Testing

### Integration Tests

Integration tests are located in `src/services/directory-services/gsuite-directory.service.integration.spec.ts`.

**Test Coverage:**

- Basic sync (users and groups)
- Sync with filters
- Users-only sync
- Groups-only sync
- User filtering scenarios
- Group filtering scenarios
- Disabled users handling
- Group membership scenarios
- Error handling

**Running Integration Tests:**

Integration tests require live Google Workspace credentials:

1. Create a `.env` file in the `utils/` folder with:
   ```
   GOOGLE_ADMIN_USER=admin@example.com
   GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_DOMAIN=example.com
   ```
2. Run tests:

   ```bash
   # Run all integration tests (includes LDAP, Google Workspace, etc.)
   npm run test:integration

   # Run only Google Workspace integration tests
   npx jest gsuite-directory.service.integration.spec.ts
   ```

**Test Data:**

The integration tests expect specific test data in Google Workspace:

- **Users**: 5 test users in organizational unit `/Integration testing`
  - testuser1@bwrox.dev (in Group A)
  - testuser2@bwrox.dev (in Groups A & B)
  - testuser3@bwrox.dev (in Group B)
  - testuser4@bwrox.dev (no groups)
  - testuser5@bwrox.dev (disabled)

- **Groups**: 2 test groups with name pattern `Integration*`
  - Integration Test Group A
  - Integration Test Group B

## API Reference

### Google Admin SDK APIs Used

- **Users API**: `admin.users.list()`
  - [Documentation](https://developers.google.com/admin-sdk/directory/reference/rest/v1/users/list)

- **Groups API**: `admin.groups.list()`
  - [Documentation](https://developers.google.com/admin-sdk/directory/reference/rest/v1/groups/list)

- **Members API**: `admin.members.list()`
  - [Documentation](https://developers.google.com/admin-sdk/directory/reference/rest/v1/members/list)

### Rate Limits

Google Workspace Directory API rate limits:

- Default: 2,400 queries per minute per user, per Google Cloud Project

The service does not implement rate limiting logic; it relies on API error responses.

## Resources

- [Google Admin SDK Directory API Guide](https://developers.google.com/admin-sdk/directory/v1/guides)
- [Service Account Authentication](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Domain-wide Delegation](https://support.google.com/a/answer/162106)
- [Google Workspace Admin Console](https://admin.google.com)
- [Bitwarden Directory Connector Documentation](https://bitwarden.com/help/directory-sync/)
