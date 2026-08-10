/// Windows-only: migrates credentials stored by keytar (UTF-8 blob via CredWriteA) to the
/// UTF-16 format expected by desktop_core (CredWriteW).
///
/// `get_password_keytar` reads the raw credential blob as UTF-8 bytes, matching the format
/// written by keytar (CredWriteA). `read_keytar_password` returns `None` if the credential
/// does not exist (ERROR_NOT_FOUND) and propagates any other Credential Manager error.
/// `migrate_keytar_password` reads via `read_keytar_password` and re-saves with
/// desktop_core's `set_password` (CredWriteW, UTF-16 encoding).
use anyhow::Result;
use widestring::U16CString;
use windows::{
    core::PCWSTR,
    Win32::Foundation::ERROR_NOT_FOUND,
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
            Some(CRED_FLAGS_NONE),
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

pub async fn read_keytar_password(service: &str, account: &str) -> Result<Option<String>> {
    match get_password_keytar(service, account) {
        Ok(v) => Ok(Some(v)),
        Err(e) => {
            // CredReadW returns ERROR_NOT_FOUND when the credential does not exist.
            let not_found = e
                .downcast_ref::<windows::core::Error>()
                .map(|we| we.code() == ERROR_NOT_FOUND.to_hresult())
                .unwrap_or(false);
            if not_found {
                Ok(None)
            } else {
                Err(e)
            }
        }
    }
}

pub async fn migrate_keytar_password(service: &str, account: &str) -> Result<bool> {
    let value = match read_keytar_password(service, account).await? {
        Some(v) => v,
        None => return Ok(false),
    };

    desktop_core::password::set_password(service, account, &value).await?;

    Ok(true)
}
