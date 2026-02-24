#[macro_use]
extern crate napi_derive;


/// Fetch the stored password from the keychain.
/// Throws an Error with message PASSWORD_NOT_FOUND if the password does not exist.
#[napi]
pub async fn get_password(service: String, account: String) -> napi::Result<String> {
    desktop_core::password::get_password(&service, &account)
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Save the password to the keychain. Adds an entry if none exists, otherwise updates it.
#[napi]
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
#[napi]
pub async fn delete_password(service: String, account: String) -> napi::Result<()> {
    desktop_core::password::delete_password(&service, &account)
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Check if OS secure storage is available.
#[napi]
pub async fn is_available() -> napi::Result<bool> {
    desktop_core::password::is_available()
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}

/// Migrate a credential that was stored by keytar (UTF-8 blob) to the new UTF-16 format
/// used by desktop_core on Windows. No-ops on non-Windows platforms.
///
/// Returns true if a migration was performed, false if the credential was already in the
/// correct format or does not exist.
#[napi]
pub async fn migrate_keytar_password(service: String, account: String) -> napi::Result<bool> {
    #[cfg(windows)]
    {
        migration::migrate_keytar_password(&service, &account)
            .await
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }
    #[cfg(not(windows))]
    {
        let _ = (service, account);
        Ok(false)
    }
}

#[cfg(windows)]
mod migration;
