/// Windows-only: reads credentials stored by keytar, which wrote UTF-8 blobs.
use anyhow::{anyhow, Result};

use crate::credential::read_blob;

/// Returns the keytar-written credential as a string, or `None` if it does not exist.
/// Propagates any other Credential Manager error.
pub async fn read_keytar_password(service: &str, account: &str) -> Result<Option<String>> {
    match read_blob(service, account)? {
        Some(blob) => {
            let value = String::from_utf8(blob)
                .map_err(|_| anyhow!("Credential blob is not valid UTF-8."))?;
            Ok(Some(value))
        }
        None => Ok(None),
    }
}
