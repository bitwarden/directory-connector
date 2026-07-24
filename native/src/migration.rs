/// Windows-only: migrates credentials stored by keytar (UTF-8 blob via CredWriteA) to the
/// UTF-16 format expected by desktop_core (CredWriteW).
///
/// `get_password_keytar` reads the raw credential blob as UTF-8 bytes, matching the format
/// written by keytar (CredWriteA). `migrate_keytar_password` reads the value using
/// `get_password_keytar` and re-saves it with desktop_core's `set_password` (CredWriteW,
/// UTF-16 encoding). Returns false if the credential does not exist or cannot be read.
///
/// `find_legacy_keytar_accounts` enumerates all credentials stored under a service prefix and
/// returns any whose suffix matches a known legacy keytar key pattern (e.g. "_ldapPassword").
/// This handles installs where credentials remain under "{orgId}_ldapPassword" instead of "secretLdap".
#[cfg(windows)]
use anyhow::Result;

#[cfg(windows)]
fn parse_keytar_blob(bytes: &[u8]) -> Result<String> {
    Ok(String::from(std::str::from_utf8(bytes)?))
}

/// Maps a legacy keytar account suffix (e.g. "_ldapPassword") to the canonical flat
/// SecureStorageKey (e.g. "secretLdap"). Returns None if the suffix is not recognised.
#[cfg(windows)]
pub fn legacy_suffix_to_flat_key(account: &str) -> Option<&'static str> {
    // These suffixes match the old {userId}_* key names keytar used before the 3→5 migration.
    const SUFFIXES: &[(&str, &str)] = &[
        ("_ldapPassword", "secretLdap"),
        ("_gsuitePrivateKey", "secretGsuite"),
        ("_azureKey", "secretAzure"),
        ("_entraIdKey", "secretEntra"),
        ("_entraKey", "secretEntra"),
        ("_oktaToken", "secretOkta"),
        ("_oneLoginClientSecret", "secretOneLogin"),
        ("_accessToken", "accessToken"),
        ("_refreshToken", "refreshToken"),
        ("_apiKeyClientId", "apiKeyClientId"),
        ("_apiKeyClientSecret", "apiKeyClientSecret"),
        ("_twoFactorToken", "twoFactorToken"),
    ];

    for (suffix, flat_key) in SUFFIXES {
        if account.ends_with(suffix) {
            return Some(flat_key);
        }
    }
    None
}

#[cfg(windows)]
use widestring::{U16CStr, U16CString};
#[cfg(windows)]
use windows::{
    core::PCWSTR,
    Win32::Security::Credentials::{
        CredEnumerateW, CredFree, CredReadW, CREDENTIALW, CRED_TYPE_GENERIC,
    },
};

#[cfg(windows)]
const CRED_FLAGS_NONE: u32 = 0;

#[cfg(windows)]
fn get_password_keytar(service: &str, account: &str) -> Result<String> {
    let target_name = U16CString::from_str(format!("{}/{}", service, account))?;

    let mut credential: *mut CREDENTIALW = std::ptr::null_mut();
    let credential_ptr = &mut credential;

    let result = unsafe {
        CredReadW(
            PCWSTR(target_name.as_ptr()),
            CRED_TYPE_GENERIC,
            Some(CRED_FLAGS_NONE),
            credential_ptr,
        )
    };

    scopeguard::defer!({
        if !credential.is_null() {
            unsafe { CredFree(credential as *mut _) };
        }
    });

    result?;

    let bytes = unsafe {
        let blob_ptr = (*credential).CredentialBlob;
        let blob_size = (*credential).CredentialBlobSize as usize;
        if blob_ptr.is_null() || blob_size == 0 {
            return Ok(String::new());
        }
        std::slice::from_raw_parts(blob_ptr, blob_size)
    };

    parse_keytar_blob(bytes)
}

/// Enumerates all credentials whose target name starts with "{service}/" and returns
/// pairs of (legacy_account, flat_key) for any that match a known legacy keytar suffix.
/// Used to migrate credentials that were never renamed from "{orgId}_ldapPassword" etc.
#[cfg(windows)]
pub fn find_legacy_keytar_accounts(service: &str) -> Result<Vec<(String, &'static str)>> {
    // CredEnumerateW uses "*" as a wildcard — without it the filter is an exact match.
    let filter = U16CString::from_str(format!("{}/*", service))?;

    let mut count: u32 = 0;
    let mut credentials: *mut *mut CREDENTIALW = std::ptr::null_mut();

    let result = unsafe {
        CredEnumerateW(
            PCWSTR(filter.as_ptr()),
            // None = no flags, use the supplied prefix filter (not CRED_ENUMERATE_ALL_CREDENTIALS)
            None,
            &mut count,
            &mut credentials,
        )
    };

    scopeguard::defer!({
        if !credentials.is_null() {
            unsafe { CredFree(credentials as *mut _) };
        }
    });

    // ERROR_NOT_FOUND (0x80070490) means no matching credentials — return empty, not error.
    if let Err(e) = result {
        use windows::Win32::Foundation::ERROR_NOT_FOUND;
        if e == ERROR_NOT_FOUND.into() {
            return Ok(vec![]);
        }
        return Err(anyhow::anyhow!(e));
    }

    let prefix = format!("{}/", service);
    let mut matches = Vec::new();

    for i in 0..count as usize {
        let cred = unsafe { &**credentials.add(i) };
        if cred.TargetName.is_null() {
            continue;
        }
        let target = unsafe { U16CStr::from_ptr_str(cred.TargetName.0) }.to_string_lossy();
        let account = match target.strip_prefix(&prefix) {
            Some(a) => a,
            None => continue,
        };
        if let Some(flat_key) = legacy_suffix_to_flat_key(account) {
            matches.push((account.to_string(), flat_key));
        }
    }

    Ok(matches)
}

/// Reads a keytar UTF-8 credential stored under `old_account` and writes it under
/// `new_account` using desktop_core's UTF-16 encoding. Returns false if the old
/// credential does not exist or cannot be parsed.
#[cfg(windows)]
pub async fn migrate_keytar_password_as(
    service: &str,
    old_account: &str,
    new_account: &str,
) -> Result<bool> {
    #[cfg(windows)]
    {
        let value = match get_password_keytar(service, old_account) {
            Err(_) => return Ok(false),
            Ok(v) => v,
        };
        desktop_core::password::set_password(service, new_account, &value).await?;
        Ok(true)
    }

    #[cfg(not(windows))]
    {
        let _ = (service, old_account, new_account);
        Ok(false)
    }
}

#[cfg(windows)]
pub async fn migrate_keytar_password(service: &str, account: &str) -> Result<bool> {
    #[cfg(windows)]
    {
        let value = match get_password_keytar(service, account) {
            Err(_) => return Ok(false),
            Ok(v) => v,
        };

        desktop_core::password::set_password(service, account, &value).await?;

        Ok(true)
    }

    #[cfg(not(windows))]
    {
        let _ = (service, account);
        Ok(false)
    }
}

/// Finds legacy keytar credentials under the service prefix, migrates each one's
/// UTF-8 blob to UTF-16 under the canonical flat key name, and returns a list of
/// (legacy_account, flat_key) pairs for every credential that was migrated.
#[cfg(windows)]
pub async fn migrate_legacy_keytar_accounts(
    service: &str,
) -> Result<Vec<(String, &'static str)>> {
    #[cfg(windows)]
    {
        let legacy_accounts = find_legacy_keytar_accounts(service)?;
        let mut migrated = Vec::new();
        // Track which flat keys have already been written so _entraKey cannot
        // overwrite _entraIdKey regardless of CredEnumerateW ordering.
        let mut written_flat_keys = std::collections::HashSet::new();

        for (legacy_account, flat_key) in legacy_accounts {
            // _entraIdKey and _entraKey both map to "secretEntra". Prefer whichever
            // arrives first and skip the other so the lower-priority fallback can't win.
            if written_flat_keys.contains(flat_key) {
                continue;
            }
            let value = match get_password_keytar(service, &legacy_account) {
                Err(_) => continue,
                Ok(v) => v,
            };
            desktop_core::password::set_password(service, flat_key, &value).await?;
            written_flat_keys.insert(flat_key);
            migrated.push((legacy_account, flat_key));
        }

        Ok(migrated)
    }

    #[cfg(not(windows))]
    {
        let _ = service;
        Ok(vec![])
    }
}

#[cfg(all(test, windows))]
mod tests {
    use super::legacy_suffix_to_flat_key;

    // legacy_suffix_to_flat_key tests
    #[test]
    fn maps_known_suffixes_to_flat_keys() {
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_ldapPassword"),
            Some("secretLdap")
        );
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_gsuitePrivateKey"),
            Some("secretGsuite")
        );
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_azureKey"),
            Some("secretAzure")
        );
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_entraIdKey"),
            Some("secretEntra")
        );
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_entraKey"),
            Some("secretEntra")
        );
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_oktaToken"),
            Some("secretOkta")
        );
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_oneLoginClientSecret"),
            Some("secretOneLogin")
        );
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_accessToken"),
            Some("accessToken")
        );
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_refreshToken"),
            Some("refreshToken")
        );
        assert_eq!(
            legacy_suffix_to_flat_key("abc123_twoFactorToken"),
            Some("twoFactorToken")
        );
    }

    #[test]
    fn returns_none_for_unrecognised_account() {
        assert_eq!(legacy_suffix_to_flat_key("secretLdap"), None);
        assert_eq!(legacy_suffix_to_flat_key("abc123_unknownKey"), None);
        assert_eq!(legacy_suffix_to_flat_key(""), None);
    }

    #[test]
    fn org_id_prefix_does_not_affect_mapping() {
        // The org/user id prefix is arbitrary — only the suffix matters.
        assert_eq!(
            legacy_suffix_to_flat_key("org-uuid-1234-5678_ldapPassword"),
            Some("secretLdap")
        );
    }
}
