//! Windows-only: migrates credentials stored by earlier versions of Directory Connector to
//! `BlobVersion::CURRENT`.
//!
//! `read_keytar_password` returns `None` if the credential does not exist (ERROR_NOT_FOUND) and
//! propagates any other Credential Manager error. Despite their names, both functions accept any
//! format `encoding.rs` can decode (keytar UTF-8, desktop_core UTF-16 or a versioned blob), so a
//! migration that runs more than once, or after the credential was already re-saved, is safe.
use anyhow::Result;

use crate::encoding::{decode_credential_blob, upgrade_credential_blob};
use crate::windows::{read_blob, write_blob};

pub fn read_keytar_password(service: &str, account: &str) -> Result<Option<String>> {
    read_blob(service, account)?
        .map(|blob| decode_credential_blob(&blob).map(|(value, _)| value))
        .transpose()
}

/// Returns `true` if the credential was rewritten, or `false` if it does not exist or is already
/// in the current version.
pub fn migrate_keytar_password(service: &str, account: &str) -> Result<bool> {
    let Some(blob) = read_blob(service, account)? else {
        return Ok(false);
    };
    let Some(upgraded) = upgrade_credential_blob(&blob)? else {
        return Ok(false);
    };
    write_blob(service, account, &upgraded)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::encoding::{encode_credential_blob, MAX_CREDENTIAL_BLOB_SIZE};
    use crate::windows::get_password;
    use widestring::U16CString;
    use windows::{
        core::PCWSTR,
        Win32::Security::Credentials::{CredDeleteW, CRED_TYPE_GENERIC},
    };

    const SERVICE: &str = "BitwardenDirectoryConnectorMigrationTest";

    fn cleanup(account: &str) {
        let target_name = U16CString::from_str(format!("{}/{}", SERVICE, account)).unwrap();
        let _ = unsafe { CredDeleteW(PCWSTR(target_name.as_ptr()), CRED_TYPE_GENERIC, None) };
    }

    fn google_private_key_json() -> String {
        format!("\"{}\"", "A".repeat(1730))
    }

    /// Runs the migration against `stored`, then reads the result back the way the app does.
    fn migrate(account: &str, stored: &[u8]) -> (Result<bool>, Vec<u8>, Result<String>) {
        write_blob(SERVICE, account, stored).unwrap();

        let migrated = migrate_keytar_password(SERVICE, account);
        let blob = read_blob(SERVICE, account).unwrap().unwrap();
        let read = get_password(SERVICE, account);
        cleanup(account);

        (migrated, blob, read)
    }

    #[test]
    fn migrates_keytar_utf8_blobs_to_the_current_version() {
        for (account, value) in [
            ("keytar-ascii", "\"secret\"".to_owned()),
            ("keytar-non-ascii", "\"pässwörd 漢字 🔑\"".to_owned()),
            ("keytar-google-key", google_private_key_json()),
        ] {
            let (migrated, blob, read) = migrate(account, value.as_bytes());

            assert!(migrated.unwrap());
            assert_eq!(blob, encode_credential_blob(&value).unwrap());
            assert_eq!(read.unwrap(), value);
        }
    }

    #[test]
    fn migrates_desktop_core_utf16_blobs_to_the_current_version() {
        let value = "\"legacy-secret\"";
        let utf16: Vec<u8> = value.encode_utf16().flat_map(u16::to_le_bytes).collect();

        let (migrated, blob, read) = migrate("desktop-core", &utf16);

        assert!(migrated.unwrap());
        assert_eq!(blob, encode_credential_blob(value).unwrap());
        assert_eq!(read.unwrap(), value);
    }

    #[test]
    fn leaves_blobs_already_in_the_current_version_untouched() {
        let value = "\"secret\"";
        let current = encode_credential_blob(value).unwrap();

        let (migrated, blob, read) = migrate("current", &current);

        assert!(!migrated.unwrap());
        assert_eq!(blob, current);
        assert_eq!(read.unwrap(), value);
    }

    #[test]
    fn migrated_google_key_fits_in_credential_manager() {
        let (_, blob, _) = migrate("google-key-size", google_private_key_json().as_bytes());

        assert!(blob.len() <= MAX_CREDENTIAL_BLOB_SIZE);
    }

    #[test]
    fn reads_legacy_keytar_blobs() {
        let account = "read-keytar";
        let value = "\"pässwörd\"";
        write_blob(SERVICE, account, value.as_bytes()).unwrap();

        let read = read_keytar_password(SERVICE, account);
        cleanup(account);

        assert_eq!(read.unwrap().as_deref(), Some(value));
    }

    #[test]
    fn missing_credentials_are_not_migrated() {
        assert!(!migrate_keytar_password(SERVICE, "does-not-exist").unwrap());
        assert_eq!(
            read_keytar_password(SERVICE, "does-not-exist").unwrap(),
            None
        );
    }
}
