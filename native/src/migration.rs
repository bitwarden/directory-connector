/// Windows-only: migrates credentials stored by keytar (UTF-8 blob via CredWriteA) to the
/// UTF-16 format expected by desktop_core (CredWriteW).
///
/// `get_password_keytar` reads the raw credential blob as UTF-8 bytes, matching the format
/// written by keytar (CredWriteA). `migrate_keytar_password` reads the value using
/// `get_password_keytar` and re-saves it with desktop_core's `set_password` (CredWriteW,
/// UTF-16 encoding). Returns false if the credential does not exist or cannot be read.
use anyhow::Result;
use widestring::U16CString;
use windows::{
    core::PCWSTR,
    Win32::Security::Credentials::{CredFree, CredReadW, CREDENTIALW, CRED_TYPE_GENERIC},
};

const CRED_FLAGS_NONE: u32 = 0;

fn get_password_keytar(service: &str, account: &str) -> Result<String> {
    let target_name = U16CString::from_str(format!("{}/{}", service, account))?;

    let mut credential: *mut CREDENTIALW = std::ptr::null_mut();
    let credential_ptr = &mut credential;

    let result = unsafe {
        CredReadW(
            PCWSTR(target_name.as_ptr()),
            CRED_TYPE_GENERIC,
            CRED_FLAGS_NONE,
            credential_ptr,
        )
    };

    scopeguard::defer!({
        unsafe { CredFree(credential as *mut _) };
    });

    result?;

    let password = unsafe {
        std::str::from_utf8_unchecked(std::slice::from_raw_parts(
            (*credential).CredentialBlob,
            (*credential).CredentialBlobSize as usize,
        ))
    };

    Ok(String::from(password))
}

pub async fn migrate_keytar_password(service: &str, account: &str) -> Result<bool> {
    let value = match get_password_keytar(service, account) {
        Err(_) => return Ok(false),
        Ok(v) => v,
    };

    desktop_core::password::set_password(service, account, &value).await?;

    Ok(true)
}
