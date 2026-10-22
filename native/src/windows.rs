//! Windows-only: reads and writes Credential Manager entries using `encoding.rs` instead of
//! desktop_core, which can only write UTF-16. Entries match desktop_core's target name, user name and
//! persistence, so either can read the other's entries. Deletion still goes through desktop_core.

use anyhow::{anyhow, Result};
use widestring::U16CString;
use windows::{
    core::{PCWSTR, PWSTR},
    Win32::Foundation::{ERROR_NOT_FOUND, FILETIME},
    Win32::Security::Credentials::{
        CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_FLAGS, CRED_PERSIST_ENTERPRISE,
        CRED_TYPE_GENERIC,
    },
};

use crate::encoding::BlobVersion;

fn target_name(service: &str, account: &str) -> String {
    format!("{}/{}", service, account)
}

pub(crate) fn read_blob(service: &str, account: &str) -> Result<Option<Vec<u8>>> {
    let target_name = U16CString::from_str(target_name(service, account))?;
    let mut credential: *mut CREDENTIALW = std::ptr::null_mut();

    let result = unsafe {
        CredReadW(
            PCWSTR(target_name.as_ptr()),
            CRED_TYPE_GENERIC,
            None,
            &mut credential,
        )
    };

    if let Err(e) = result {
        if e.code() == ERROR_NOT_FOUND.to_hresult() {
            return Ok(None);
        }
        return Err(e.into());
    }

    scopeguard::defer!({
        unsafe { CredFree(credential as *const _) };
    });

    let blob = unsafe {
        let size = (*credential).CredentialBlobSize as usize;
        if size == 0 || (*credential).CredentialBlob.is_null() {
            Vec::new()
        } else {
            std::slice::from_raw_parts((*credential).CredentialBlob, size).to_vec()
        }
    };

    Ok(Some(blob))
}

pub(crate) fn write_blob(service: &str, account: &str, blob: &[u8]) -> Result<()> {
    let mut target_name = U16CString::from_str(target_name(service, account))?;
    let mut user_name = U16CString::from_str(account)?;

    let credential = CREDENTIALW {
        Flags: CRED_FLAGS(0),
        Type: CRED_TYPE_GENERIC,
        TargetName: PWSTR(target_name.as_mut_ptr()),
        Comment: PWSTR::null(),
        LastWritten: FILETIME::default(),
        CredentialBlobSize: blob.len() as u32,
        // CredWriteW does not modify the blob; the cast only satisfies the struct's field type.
        CredentialBlob: blob.as_ptr() as *mut u8,
        Persist: CRED_PERSIST_ENTERPRISE,
        AttributeCount: 0,
        Attributes: std::ptr::null_mut(),
        TargetAlias: PWSTR::null(),
        UserName: PWSTR(user_name.as_mut_ptr()),
    };

    unsafe { CredWriteW(&credential, 0) }?;
    Ok(())
}

pub fn get_password(service: &str, account: &str) -> Result<String> {
    let blob = read_blob(service, account)?
        .ok_or_else(|| anyhow!(desktop_core::password::PASSWORD_NOT_FOUND))?;
    let (value, _) = BlobVersion::decode(&blob)?;
    Ok(value)
}

pub fn set_password(service: &str, account: &str, password: &str) -> Result<()> {
    write_blob(
        service,
        account,
        &BlobVersion::for_value(password).encode(password)?,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use windows::Win32::Security::Credentials::CredDeleteW;

    const SERVICE: &str = "BitwardenDirectoryConnectorTest";

    fn cleanup(account: &str) {
        let target_name = U16CString::from_str(target_name(SERVICE, account)).unwrap();
        let _ = unsafe { CredDeleteW(PCWSTR(target_name.as_ptr()), CRED_TYPE_GENERIC, None) };
    }

    fn write_utf16(account: &str, value: &str) {
        let blob: Vec<u8> = value.encode_utf16().flat_map(u16::to_le_bytes).collect();
        write_blob(SERVICE, account, &blob).unwrap();
    }

    #[test]
    fn stores_a_google_private_key_sized_secret_as_v1() {
        let account = "large-secret";
        let value = format!("\"{}\"", "A".repeat(1730));

        let saved = set_password(SERVICE, account, &value);
        let blob = read_blob(SERVICE, account);
        let read = get_password(SERVICE, account);
        cleanup(account);

        saved.unwrap();
        assert_eq!(
            BlobVersion::decode(&blob.unwrap().unwrap()).unwrap().1,
            BlobVersion::V1
        );
        assert_eq!(read.unwrap(), value);
    }

    #[test]
    fn stores_secrets_that_fit_as_utf16_so_earlier_versions_can_read_them() {
        let account = "utf16-secret";
        let value = "\"pässwörd\"";

        let saved = set_password(SERVICE, account, value);
        let blob = read_blob(SERVICE, account);
        let read = get_password(SERVICE, account);
        cleanup(account);

        saved.unwrap();
        let expected: Vec<u8> = value.encode_utf16().flat_map(u16::to_le_bytes).collect();
        assert_eq!(blob.unwrap().unwrap(), expected);
        assert_eq!(read.unwrap(), value);
    }

    #[test]
    fn reads_a_secret_written_by_desktop_core() {
        let account = "desktop-core-secret";
        let value = "\"legacy-secret\"";
        write_utf16(account, value);

        let read = get_password(SERVICE, account);
        cleanup(account);

        assert_eq!(read.unwrap(), value);
    }

    #[test]
    fn reports_password_not_found_for_missing_credentials() {
        let err = get_password(SERVICE, "does-not-exist").unwrap_err();

        assert_eq!(err.to_string(), desktop_core::password::PASSWORD_NOT_FOUND);
    }
}
