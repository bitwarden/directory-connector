/// Windows-only: migrates credentials stored by keytar (UTF-8 blob via CredWriteA) to the
/// UTF-16 format expected by desktop_core (CredWriteW).
///
/// `get_password_keytar` reads the raw credential blob as UTF-8 bytes, matching the format
/// written by keytar (CredWriteA). `migrate_keytar_password` reads the value using
/// `get_password_keytar` and re-saves it with desktop_core's `set_password` (CredWriteW,
/// UTF-16 encoding). Returns false if the credential does not exist or cannot be read.
use anyhow::Result;

/// Parses a raw keytar credential blob into a String.
///
/// Keytar wrote credentials via CredWriteA as null-terminated UTF-8 strings.
/// Strips the trailing null byte (if present), validates UTF-8, and rejects any
/// remaining interior null bytes — those indicate a corrupted or UTF-16 blob.
fn parse_keytar_blob(bytes: &[u8]) -> Result<String> {
    let bytes = bytes.strip_suffix(&[0u8]).unwrap_or(bytes);
    let s = std::str::from_utf8(bytes)?;
    if s.contains('\0') {
        anyhow::bail!("credential blob contains interior null bytes");
    }
    Ok(String::from(s))
}

#[cfg(windows)]
use widestring::U16CString;
#[cfg(windows)]
use windows::{
    core::PCWSTR,
    Win32::Security::Credentials::{CredFree, CredReadW, CREDENTIALW, CRED_TYPE_GENERIC},
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
        unsafe { CredFree(credential as *mut _) };
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

#[cfg(test)]
mod tests {
    use super::parse_keytar_blob;

    #[test]
    fn plain_utf8_no_null() {
        let blob = b"secret-password";
        assert_eq!(parse_keytar_blob(blob).unwrap(), "secret-password");
    }

    #[test]
    fn strips_single_trailing_null() {
        let blob = b"secret-password\0";
        assert_eq!(parse_keytar_blob(blob).unwrap(), "secret-password");
    }

    #[test]
    fn does_not_strip_interior_null() {
        // A null byte in the middle is invalid; the call must fail, not silently truncate.
        let blob = b"sec\0ret";
        assert!(parse_keytar_blob(blob).is_err());
    }

    #[test]
    fn empty_blob_returns_empty_string() {
        assert_eq!(parse_keytar_blob(b"").unwrap(), "");
    }

    #[test]
    fn null_only_blob_returns_empty_string() {
        // A single null byte is the null terminator with no payload.
        assert_eq!(parse_keytar_blob(b"\0").unwrap(), "");
    }

    #[test]
    fn invalid_utf8_returns_error() {
        // 0xFF is never valid UTF-8.
        let blob = &[0xFFu8, 0x42];
        assert!(parse_keytar_blob(blob).is_err());
    }

    #[test]
    fn valid_utf8_multibyte() {
        let blob = "café\0".as_bytes();
        assert_eq!(parse_keytar_blob(blob).unwrap(), "café");
    }
}
