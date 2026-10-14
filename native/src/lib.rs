#[macro_use]
extern crate napi_derive;

/// The error message returned when a password is not found during retrieval or deletion.
/// Re-exported from desktop_core so JS callers have a single authoritative source.
#[napi(namespace = "passwords")]
pub const PASSWORD_NOT_FOUND: &str = desktop_core::password::PASSWORD_NOT_FOUND;

/// Fetch the stored password from the keychain.
/// Throws an Error with message PASSWORD_NOT_FOUND if the password does not exist.
/// On Windows, reads both UTF-8 blobs and the UTF-16 blobs written by desktop_core.
#[napi(namespace = "passwords")]
pub async fn get_password(service: String, account: String) -> napi::Result<String> {
    #[cfg(windows)]
    let result = credential::get_password(&service, &account);
    #[cfg(not(windows))]
    let result = desktop_core::password::get_password(&service, &account).await;

    result.map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Save the password to the keychain. Adds an entry if none exists, otherwise updates it.
/// On Windows, stores a UTF-8 blob (see encoding.rs for why desktop_core is bypassed).
#[napi(namespace = "passwords")]
pub async fn set_password(service: String, account: String, password: String) -> napi::Result<()> {
    #[cfg(windows)]
    let result = credential::set_password(&service, &account, &password);
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

/// Re-encode a Windows credential written as UTF-16 by desktop_core as UTF-8. No-ops on
/// non-Windows platforms.
///
/// Returns `{ migrated: true }` if the credential was rewritten.
/// Returns `{ migrated: false }` if the credential does not exist or is already UTF-8.
/// Returns `{ migrated: false, error: "<reason>" }` if a Credential Manager failure prevented
/// migration. Never throws.
#[napi(namespace = "passwords")]
pub async fn migrate_password_to_utf8(
    service: String,
    account: String,
) -> napi::Result<MigratePasswordResult> {
    #[cfg(windows)]
    {
        match credential::migrate_to_utf8(&service, &account) {
            Ok(migrated) => Ok(MigratePasswordResult {
                migrated,
                error: None,
            }),
            Err(e) => Ok(MigratePasswordResult {
                migrated: false,
                error: Some(e.to_string()),
            }),
        }
    }
    #[cfg(not(windows))]
    {
        let _ = (service, account);
        Ok(MigratePasswordResult {
            migrated: false,
            error: None,
        })
    }
}

#[napi(object)]
pub struct MigratePasswordResult {
    pub migrated: bool,
    pub error: Option<String>,
}

// Only used at runtime on Windows; compiled everywhere so its unit tests run on every platform.
#[cfg_attr(not(windows), allow(dead_code))]
mod encoding;

#[cfg(windows)]
mod credential;

#[cfg(windows)]
mod migration;
