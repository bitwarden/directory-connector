/// Encoding of secrets stored as Windows Credential Manager blobs.
///
/// Secrets are written as UTF-8, matching what keytar wrote before the move to desktop_core.
/// desktop_core writes UTF-16, which doubles the size of ASCII text, and Credential Manager rejects
/// any blob over `CRED_MAX_CREDENTIAL_BLOB_SIZE` (2560 bytes). That left room for only ~1280
/// characters - less than a Google Workspace service account private key.
///
/// Blobs written as UTF-16 by desktop_core (Directory Connector 2026.6.0 and later) are still read,
/// so existing secrets keep working before and after the state migration re-encodes them.
///
/// This module is platform independent so it can be unit tested anywhere; only the Windows
/// credential code uses it at runtime.
use anyhow::{anyhow, bail, Result};

/// `CRED_MAX_CREDENTIAL_BLOB_SIZE` from wincred.h.
pub const MAX_CREDENTIAL_BLOB_SIZE: usize = 5 * 512;

#[derive(Debug, PartialEq, Eq)]
pub enum BlobEncoding {
    Utf8,
    Utf16,
}

/// Encodes a secret as a UTF-8 credential blob.
///
/// Fails if the value contains a NUL character, which would make it indistinguishable from a
/// UTF-16 blob when read back, or if it exceeds the Credential Manager size limit.
pub fn encode_credential_blob(value: &str) -> Result<&[u8]> {
    if value.contains('\0') {
        bail!("Secret contains a NUL character and cannot be stored.");
    }
    let bytes = value.as_bytes();
    if bytes.len() > MAX_CREDENTIAL_BLOB_SIZE {
        bail!(
            "Secret is too large for Windows Credential Manager ({} bytes, maximum is {}).",
            bytes.len(),
            MAX_CREDENTIAL_BLOB_SIZE
        );
    }
    Ok(bytes)
}

/// Decodes a credential blob written either as UTF-8 (this module, or keytar) or as UTF-16LE
/// (desktop_core).
///
/// The two are told apart by NUL bytes. UTF-8 only produces a 0x00 byte for U+0000, which
/// `encode_credential_blob` rejects (and JSON escapes as `\u0000`). UTF-16LE produces a 0x00 byte
/// for every ASCII character, and every value Directory Connector stores is JSON, which always
/// starts with an ASCII character.
pub fn decode_credential_blob(blob: &[u8]) -> Result<(String, BlobEncoding)> {
    if !blob.contains(&0) {
        let value = std::str::from_utf8(blob)
            .map_err(|_| anyhow!("Credential blob is not valid UTF-8."))?;
        return Ok((value.to_owned(), BlobEncoding::Utf8));
    }

    if !blob.len().is_multiple_of(2) {
        bail!("Credential blob is neither valid UTF-8 nor valid UTF-16.");
    }
    let units: Vec<u16> = blob
        .chunks_exact(2)
        .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
        .collect();
    let value =
        String::from_utf16(&units).map_err(|_| anyhow!("Credential blob is not valid UTF-16."))?;
    Ok((value, BlobEncoding::Utf16))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A 2048-bit RSA PKCS#8 private key as stored by Directory Connector: JSON-encoded, with
    /// newlines escaped. Real Google Workspace service account keys are this size (~1730 chars).
    fn google_private_key_json() -> String {
        let body: Vec<String> = (0..26)
            .map(|i| ((b'A' + i as u8) as char).to_string().repeat(64))
            .collect();
        let pem = format!(
            "-----BEGIN PRIVATE KEY-----\n{}\n-----END PRIVATE KEY-----\n",
            body.join("\n")
        );
        format!("\"{}\"", pem.replace('\n', "\\n"))
    }

    /// How desktop_core encodes a blob: UTF-16LE.
    fn utf16_blob(value: &str) -> Vec<u8> {
        value.encode_utf16().flat_map(u16::to_le_bytes).collect()
    }

    #[test]
    fn google_private_key_fits_as_utf8() {
        let key = google_private_key_json();

        let blob = encode_credential_blob(&key).unwrap();

        assert!(blob.len() <= MAX_CREDENTIAL_BLOB_SIZE);
    }

    #[test]
    fn google_private_key_does_not_fit_as_utf16() {
        // Regression context: this is why saving Google Workspace settings failed on Windows.
        assert!(utf16_blob(&google_private_key_json()).len() > MAX_CREDENTIAL_BLOB_SIZE);
    }

    #[test]
    fn round_trips_google_private_key() {
        let key = google_private_key_json();

        let blob = encode_credential_blob(&key).unwrap();

        assert_eq!(
            decode_credential_blob(blob).unwrap(),
            (key, BlobEncoding::Utf8)
        );
    }

    #[test]
    fn round_trips_non_ascii_values() {
        let value = "\"pässwörd 漢字 🔑\"";

        let blob = encode_credential_blob(value).unwrap();

        assert_eq!(
            decode_credential_blob(blob).unwrap(),
            (value.to_owned(), BlobEncoding::Utf8)
        );
    }

    #[test]
    fn decodes_utf16_blobs_written_by_desktop_core() {
        let value = "\"pässwörd 漢字 🔑\"";

        assert_eq!(
            decode_credential_blob(&utf16_blob(value)).unwrap(),
            (value.to_owned(), BlobEncoding::Utf16)
        );
    }

    #[test]
    fn decodes_empty_blob_as_empty_string() {
        assert_eq!(
            decode_credential_blob(&[]).unwrap(),
            (String::new(), BlobEncoding::Utf8)
        );
    }

    #[test]
    fn rejects_values_over_the_size_limit() {
        let value = "a".repeat(MAX_CREDENTIAL_BLOB_SIZE + 1);

        let err = encode_credential_blob(&value).unwrap_err();

        assert!(err.to_string().contains("too large"));
    }

    #[test]
    fn accepts_values_at_the_size_limit() {
        let value = "a".repeat(MAX_CREDENTIAL_BLOB_SIZE);

        assert!(encode_credential_blob(&value).is_ok());
    }

    #[test]
    fn rejects_values_containing_nul() {
        assert!(encode_credential_blob("a\0b").is_err());
    }

    #[test]
    fn size_error_does_not_include_the_secret() {
        let value = "s3cret".repeat(MAX_CREDENTIAL_BLOB_SIZE);

        let err = encode_credential_blob(&value).unwrap_err();

        assert!(!err.to_string().contains("s3cret"));
    }

    #[test]
    fn rejects_odd_length_blobs_containing_nul() {
        assert!(decode_credential_blob(&[b'a', 0, b'b']).is_err());
    }

    #[test]
    fn rejects_invalid_utf8() {
        assert!(decode_credential_blob(&[0xff, 0xfe, 0xfd]).is_err());
    }
}
