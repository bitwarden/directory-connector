/// Windows-only: migrates credentials stored by keytar (UTF-8 blob via CredWriteA) to the
/// UTF-16 format expected by desktop_core (CredWriteW).
///
/// Keytar used CredWriteA on Windows, which stored the credential blob as raw UTF-8 bytes.
/// desktop_core uses CredWriteW with a UTF-16 encoded blob. Reading old keytar credentials
/// through desktop_core's get_password produces garbled output because the UTF-8 bytes are
/// reinterpreted as UTF-16.
///
/// This function detects the old format by checking whether the raw blob bytes are valid UTF-8
/// without null bytes (UTF-16 LE encoding of ASCII always contains null bytes). If so, it
/// re-saves the credential using desktop_core's set_password (UTF-16 encoding).
use anyhow::{anyhow, Result};
use widestring::U16CString;
use windows::{
    core::PCWSTR,
    Win32::Security::Credentials::{CredFree, CredReadW, CRED_TYPE_GENERIC},
};

pub async fn migrate_keytar_password(service: &str, account: &str) -> Result<bool> {
    let target = format!("{}/{}", service, account);
    let target_wide = U16CString::from_str(&target)?;

    let mut credential = std::ptr::null_mut();
    let result = unsafe {
        CredReadW(
            PCWSTR(target_wide.as_ptr()),
            CRED_TYPE_GENERIC,
            None,
            &mut credential,
        )
    };

    scopeguard::defer! {{
        unsafe { CredFree(credential as *mut _) };
    }};

    if result.is_err() {
        // Credential does not exist; nothing to migrate.
        return Ok(false);
    }

    let blob_bytes: Vec<u8> = unsafe {
        let blob_ptr = (*credential).CredentialBlob;
        let blob_size = (*credential).CredentialBlobSize as usize;
        if blob_ptr.is_null() || blob_size == 0 {
            return Ok(false);
        }
        std::slice::from_raw_parts(blob_ptr, blob_size).to_vec()
    };

    // UTF-16 LE encoding of ASCII always contains null bytes (e.g. 'A' → 0x41 0x00).
    // Keytar stored raw UTF-8 bytes which will never contain null bytes for valid JSON.
    // If the blob is valid UTF-8 and contains no null bytes, it was written by keytar.
    let blob_is_utf8 = std::str::from_utf8(&blob_bytes)
        .map(|s| !s.contains('\0'))
        .unwrap_or(false);

    if !blob_is_utf8 {
        // Already UTF-16 or unrecognised format; no migration needed.
        return Ok(false);
    }

    let utf8_value = String::from_utf8(blob_bytes).map_err(|e| anyhow!(e))?;
    desktop_core::password::set_password(service, account, &utf8_value).await?;

    Ok(true)
}
