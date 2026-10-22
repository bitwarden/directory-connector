//! Windows-only: migrates credentials stored by keytar (UTF-8) to the format `set_password` writes.
//!
//! Earlier migrations in the same run may already have written a credential through
//! `set_password`, so both functions detect the stored format rather than assuming keytar's.
//! `read_keytar_password` returns `None` if the credential does not exist (ERROR_NOT_FOUND) and
//! propagates any other Credential Manager error.
use anyhow::Result;

use crate::encoding::BlobVersion;
use crate::windows::{read_blob, set_password};

pub fn read_keytar_password(service: &str, account: &str) -> Result<Option<String>> {
    read_blob(service, account)?
        .map(|blob| BlobVersion::decode(&blob).map(|(value, _)| value))
        .transpose()
}

/// Returns `true` if the credential was rewritten, or `false` if it does not exist or is already
/// stored the way `set_password` would store it.
pub fn migrate_keytar_password(service: &str, account: &str) -> Result<bool> {
    let Some(blob) = read_blob(service, account)? else {
        return Ok(false);
    };
    let (value, stored) = BlobVersion::decode(&blob)?;
    if stored == BlobVersion::for_value(&value) {
        return Ok(false);
    }
    set_password(service, account, &value)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::encoding::MAX_CREDENTIAL_BLOB_SIZE;
    use crate::windows::{get_password, write_blob};
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

    fn utf16(value: &str) -> Vec<u8> {
        value.encode_utf16().flat_map(u16::to_le_bytes).collect()
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
    fn migrates_keytar_blobs_to_utf16() {
        for (account, value) in [
            ("keytar-ascii", "\"secret\""),
            ("keytar-non-ascii", "\"pässwörd 漢字 🔑\""),
        ] {
            let (migrated, blob, read) = migrate(account, value.as_bytes());

            assert!(migrated.unwrap());
            assert_eq!(blob, utf16(value));
            assert_eq!(read.unwrap(), value);
        }
    }

    #[test]
    fn migrates_keytar_google_private_key_to_v1() {
        let value = google_private_key_json();

        let (migrated, blob, read) = migrate("keytar-google-key", value.as_bytes());

        assert!(migrated.unwrap());
        assert_eq!(BlobVersion::decode(&blob).unwrap().1, BlobVersion::V1);
        assert!(blob.len() <= MAX_CREDENTIAL_BLOB_SIZE);
        assert_eq!(read.unwrap(), value);
    }

    #[test]
    fn leaves_utf16_blobs_untouched() {
        let value = "\"secret\"";

        let (migrated, blob, read) = migrate("utf16", &utf16(value));

        assert!(!migrated.unwrap());
        assert_eq!(blob, utf16(value));
        assert_eq!(read.unwrap(), value);
    }

    /// 3→5 copies secrets to their new keys through `set_password` before 5→6 runs.
    #[test]
    fn leaves_secrets_saved_by_the_previous_migration_untouched() {
        for (account, value) in [
            ("saved-secret", "\"secret\"".to_owned()),
            ("saved-google-key", google_private_key_json()),
        ] {
            set_password(SERVICE, account, &value).unwrap();
            let saved = read_blob(SERVICE, account).unwrap().unwrap();

            let (migrated, blob, read) = migrate(account, &saved);

            assert!(!migrated.unwrap());
            assert_eq!(blob, saved);
            assert_eq!(read.unwrap(), value);
        }
    }

    #[test]
    fn reads_keytar_blobs() {
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
