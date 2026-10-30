#[macro_use]
extern crate napi_derive;

/// The error message returned when a password is not found during retrieval or deletion.
/// Re-exported from desktop_core so JS callers have a single authoritative source.
#[napi(namespace = "passwords")]
pub const PASSWORD_NOT_FOUND: &str = desktop_core::password::PASSWORD_NOT_FOUND;

/// Fetch the stored password from the keychain.
/// Throws an Error with message PASSWORD_NOT_FOUND if the password does not exist.
#[napi(namespace = "passwords")]
pub async fn get_password(service: String, account: String) -> napi::Result<String> {
    desktop_core::password::get_password(&service, &account)
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Save the password to the keychain. Adds an entry if none exists, otherwise updates it.
#[napi(namespace = "passwords")]
pub async fn set_password(
    service: String,
    account: String,
    password: String,
) -> napi::Result<()> {
    desktop_core::password::set_password(&service, &account, &password)
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Like `get_password`, but on Windows also reads secrets saved by `set_password_v_next`.
/// Only use for the Google Workspace private key.
/// Throws an Error with message PASSWORD_NOT_FOUND if the password does not exist.
#[napi(namespace = "passwords")]
pub async fn get_password_v_next(service: String, account: String) -> napi::Result<String> {
    #[cfg(windows)]
    let result = windows::get_password_v_next(&service, &account);
    #[cfg(not(windows))]
    let result = desktop_core::password::get_password(&service, &account).await;

    result.map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Like `set_password`, but on Windows saves the secret as UTF-8 with a version header, so values
/// too large for Credential Manager as UTF-16 still fit. Earlier versions of Directory Connector
/// cannot read these. Only use for the Google Workspace private key, and read it back with
/// `get_password_v_next`.
#[napi(namespace = "passwords")]
pub async fn set_password_v_next(
    service: String,
    account: String,
    password: String,
) -> napi::Result<()> {
    #[cfg(windows)]
    let result = windows::set_password_v_next(&service, &account, &password);
    #[cfg(not(windows))]
    let result = desktop_core::password::set_password(&service, &account, &password).await;

    result.map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Delete the stored password from the keychain.
/// Throws an Error with message PASSWORD_NOT_FOUND if the password does not exist.
#[napi(namespace = "passwords")]
pub async fn delete_password(service: String, account: String) -> napi::Result<()> {
    desktop_core::password::delete_password(&service, &account)
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Check if OS secure storage is available.
#[napi(namespace = "passwords")]
pub async fn is_available() -> napi::Result<bool> {
    desktop_core::password::is_available()
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Read a credential that was stored by keytar (UTF-8 blob) and return the correctly
/// re-encoded string value without writing anything. Returns null if the credential does
/// not exist (ERROR_NOT_FOUND). Throws on a real Credential Manager failure so callers
/// can distinguish "not present" from "read error". No-op on non-Windows platforms (returns null).
#[napi(namespace = "passwords")]
pub async fn read_keytar_password(
    service: String,
    account: String,
) -> napi::Result<Option<String>> {
    #[cfg(windows)]
    {
        migration::read_keytar_password(&service, &account)
            .await
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }
    #[cfg(not(windows))]
    {
        let _ = (service, account);
        Ok(None)
    }
}

/// Migrate a credential that was stored by keytar (UTF-8 blob) to the new UTF-16 format
/// used by desktop_core on Windows. No-ops on non-Windows platforms.
///
/// Returns `{ migrated: true }` if a migration was performed.
/// Returns `{ migrated: false }` if the credential does not exist or is already in the correct
/// format. Returns `{ migrated: false, error: "<reason>" }` if a Credential Manager failure
/// prevented migration. Never throws.
#[napi(namespace = "passwords")]
pub async fn migrate_keytar_password(
    service: String,
    account: String,
) -> napi::Result<MigrateKeytarResult> {
    #[cfg(windows)]
    {
        let result = migration::migrate_keytar_password(&service, &account).await;
        match result {
            Ok(migrated) => Ok(MigrateKeytarResult { migrated, error: None }),
            Err(e) => Ok(MigrateKeytarResult {
                migrated: false,
                error: Some(e.to_string()),
            }),
        }
    }
    #[cfg(not(windows))]
    {
        let _ = (service, account);
        Ok(MigrateKeytarResult { migrated: false, error: None })
    }
}

#[napi(object)]
pub struct MigrateKeytarResult {
    pub migrated: bool,
    pub error: Option<String>,
}

// Only used at runtime on Windows; compiled everywhere so its unit tests run on every platform.
#[cfg_attr(not(windows), allow(dead_code))]
mod encoding;

#[cfg(windows)]
mod windows;

#[cfg(windows)]
mod migration;
