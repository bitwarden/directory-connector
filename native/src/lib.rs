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
pub async fn is_available() -> napi::Result<IsAvailableResult> {
    let result = desktop_core::password::is_available().await;
    match result {
        Ok(available) => Ok(IsAvailableResult { available }),
        Err(_) => Ok(IsAvailableResult { available: false }),
    }
}

/// Migrate a credential that was stored by keytar (UTF-8 blob) to the new UTF-16 format
/// used by desktop_core on Windows. No-ops on non-Windows platforms.
///
/// Returns true if a migration was performed, false if the credential was already in the
/// correct format or does not exist.
#[napi(namespace = "passwords")]
pub async fn migrate_keytar_password(
    service: String,
    account: String,
) -> napi::Result<MigrateKeytarResult> {
    #[cfg(windows)]
    {
        let result = migration::migrate_keytar_password(&service, &account).await;
        match result {
            Ok(migrated) => Ok(MigrateKeytarResult { migrated }),
            Err(_) => Ok(MigrateKeytarResult { migrated: false }),
        }
    }
    #[cfg(not(windows))]
    {
        let _ = (service, account);
        Ok(MigrateKeytarResult { migrated: false })
    }
}

#[napi(object)]
pub struct IsAvailableResult {
    pub available: bool,
}

#[napi(object)]
pub struct MigrateKeytarResult {
    pub migrated: bool,
}

#[cfg(windows)]
mod migration;
