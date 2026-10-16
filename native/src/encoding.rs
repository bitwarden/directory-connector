//! Encoding of secrets stored as Windows Credential Manager blobs.
//!
//! Credential Manager has held three blob formats over time, and all of them are read:
//!
//! - Legacy UTF-8: raw UTF-8 with no header, written by keytar (before Directory Connector
//!   2026.6.0).
//! - Legacy UTF-16: raw UTF-16LE with no header, written by desktop_core (2026.6.0 and later).
//!   UTF-16 doubles the size of ASCII text, and Credential Manager rejects any blob over
//!   `CRED_MAX_CREDENTIAL_BLOB_SIZE` (2560 bytes). That left room for only ~1280 characters - less
//!   than a Google Workspace service account private key.
//! - Versioned: a two byte header (`VERSION_MARKER`, then a version number) followed by a payload
//!   whose format is defined by that version. New blobs are always written as
//!   `BlobVersion::CURRENT`.
//!
//! There is no state migration to re-encode existing blobs; each one is rewritten in the current
//! version the next time it is saved. `decode_credential_blob` reports which version it read, so a
//! future migration can match on old versions and re-encode them.
//!
//! To add a version: add a `BlobFormat` implementation, a `BlobVersion` variant and header number
//! for it, and point `BlobVersion::CURRENT` at it. Never change or reuse an existing version.
//!
//! This module is platform independent so it can be unit tested anywhere; only the Windows
//! credential code uses it at runtime.

use anyhow::{anyhow, bail, Result};

/// `CRED_MAX_CREDENTIAL_BLOB_SIZE` from wincred.h.
pub const MAX_CREDENTIAL_BLOB_SIZE: usize = 5 * 512;

/// First byte of every versioned blob. Legacy blobs have no header, so this must never start one.
/// Every value Directory Connector stores is JSON, which starts with an ASCII character that is
/// never a control character: a legacy UTF-8 blob starts with that character, and a legacy UTF-16
/// blob starts with its low byte.
const VERSION_MARKER: u8 = 0x01;

/// Header version number of `BlobVersion::V1`.
const V1_HEADER: u8 = 1;

/// A blob payload format.
trait BlobFormat {
    fn encode(value: &str) -> Vec<u8>;
    fn decode(payload: &[u8]) -> Result<String>;
}

/// Raw UTF-8, as written by keytar.
struct LegacyUtf8Format;

impl BlobFormat for LegacyUtf8Format {
    fn encode(value: &str) -> Vec<u8> {
        value.as_bytes().to_vec()
    }

    fn decode(payload: &[u8]) -> Result<String> {
        let value = std::str::from_utf8(payload)
            .map_err(|_| anyhow!("Credential blob is not valid UTF-8."))?;
        Ok(value.to_owned())
    }
}

/// Raw UTF-16LE, as written by desktop_core.
struct LegacyUtf16Format;

impl BlobFormat for LegacyUtf16Format {
    fn encode(value: &str) -> Vec<u8> {
        value.encode_utf16().flat_map(u16::to_le_bytes).collect()
    }

    /// Decodes up to the first NUL unit. desktop_core sizes the blob as `password.len() * 2`, where
    /// `len()` counts UTF-8 bytes, so a value containing non-ASCII characters is stored with the NUL
    /// terminator and whatever memory followed it. The terminator always directly follows the
    /// value, and no stored value contains a NUL (JSON escapes it), so stopping there recovers the
    /// value exactly.
    fn decode(payload: &[u8]) -> Result<String> {
        if !payload.len().is_multiple_of(2) {
            bail!("Credential blob is neither valid UTF-8 nor valid UTF-16.");
        }
        let units: Vec<u16> = payload
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .take_while(|&unit| unit != 0)
            .collect();
        String::from_utf16(&units).map_err(|_| anyhow!("Credential blob is not valid UTF-16."))
    }
}

/// Version 1: UTF-8.
struct V1Format;

impl BlobFormat for V1Format {
    fn encode(value: &str) -> Vec<u8> {
        value.as_bytes().to_vec()
    }

    fn decode(payload: &[u8]) -> Result<String> {
        let value = std::str::from_utf8(payload)
            .map_err(|_| anyhow!("Credential blob is not valid UTF-8."))?;
        Ok(value.to_owned())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BlobVersion {
    /// Raw UTF-8 with no header, written by keytar.
    LegacyUtf8,
    /// Raw UTF-16LE with no header, written by desktop_core.
    LegacyUtf16,
    /// Header followed by UTF-8.
    V1,
}

impl BlobVersion {
    /// The version new blobs are written as.
    pub const CURRENT: BlobVersion = BlobVersion::V1;

    fn encode(self, value: &str) -> Vec<u8> {
        match self {
            Self::LegacyUtf8 => LegacyUtf8Format::encode(value),
            Self::LegacyUtf16 => LegacyUtf16Format::encode(value),
            Self::V1 => [&[VERSION_MARKER, V1_HEADER][..], &V1Format::encode(value)].concat(),
        }
    }

    fn decode(self, payload: &[u8]) -> Result<String> {
        match self {
            Self::LegacyUtf8 => LegacyUtf8Format::decode(payload),
            Self::LegacyUtf16 => LegacyUtf16Format::decode(payload),
            Self::V1 => V1Format::decode(payload),
        }
    }

    /// Identifies the version of a blob and returns it with the blob's payload (the blob without
    /// its header).
    ///
    /// Legacy blobs are told apart by NUL bytes. UTF-8 only produces a 0x00 byte for U+0000, which
    /// JSON escapes as `\u0000`. UTF-16LE produces a 0x00 byte for every ASCII character, and JSON
    /// always starts with one.
    fn detect(blob: &[u8]) -> Result<(Self, &[u8])> {
        match blob {
            [VERSION_MARKER, version, payload @ ..] => match *version {
                V1_HEADER => Ok((Self::V1, payload)),
                version => bail!(
                    "Credential blob has unsupported format version {}. It may have been saved by a newer version of Directory Connector.",
                    version
                ),
            },
            _ if blob.contains(&0) => Ok((Self::LegacyUtf16, blob)),
            _ => Ok((Self::LegacyUtf8, blob)),
        }
    }
}

/// Encodes a secret as a credential blob in the current version.
///
/// Fails if the blob exceeds the Credential Manager size limit.
pub fn encode_credential_blob(value: &str) -> Result<Vec<u8>> {
    let blob = BlobVersion::CURRENT.encode(value);
    if blob.len() > MAX_CREDENTIAL_BLOB_SIZE {
        bail!(
            "Secret is too large for Windows Credential Manager ({} bytes, maximum is {}).",
            blob.len(),
            MAX_CREDENTIAL_BLOB_SIZE
        );
    }
    Ok(blob)
}

/// Decodes a credential blob in any version, returning the secret and the version it was stored
/// as.
pub fn decode_credential_blob(blob: &[u8]) -> Result<(String, BlobVersion)> {
    let (version, payload) = BlobVersion::detect(blob)?;
    Ok((version.decode(payload)?, version))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Length of the header on versioned blobs, which counts towards the size limit.
    const HEADER_LEN: usize = 2;

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

    /// How desktop_core actually stored a blob: the UTF-16 value plus the NUL terminator that
    /// `U16CString` adds, cut to `password.len() * 2` bytes. `len()` counts UTF-8 bytes, so a
    /// non-ASCII value runs into the terminator and then past the end of the buffer. `past_buffer`
    /// stands in for whatever memory followed the buffer.
    fn desktop_core_blob(value: &str, past_buffer: &[u16]) -> Vec<u8> {
        let size = value.len() * 2;
        let mut blob: Vec<u8> = value
            .encode_utf16()
            .chain([0])
            .chain(past_buffer.iter().copied())
            .flat_map(u16::to_le_bytes)
            .collect();
        assert!(blob.len() >= size, "past_buffer is too short");
        blob.truncate(size);
        blob
    }

    #[test]
    fn encodes_as_a_v1_header_followed_by_utf8() {
        let value = "\"pässwörd\"";

        let blob = encode_credential_blob(value).unwrap();

        assert_eq!(&blob[..HEADER_LEN], &[VERSION_MARKER, V1_HEADER]);
        assert_eq!(&blob[HEADER_LEN..], value.as_bytes());
    }

    #[test]
    fn google_private_key_fits_in_the_current_version() {
        let key = google_private_key_json();

        let blob = encode_credential_blob(&key).unwrap();

        assert!(blob.len() <= MAX_CREDENTIAL_BLOB_SIZE);
    }

    #[test]
    fn google_private_key_does_not_fit_as_utf16() {
        // Regression context: this is why saving Google Workspace settings failed on Windows.
        assert!(
            BlobVersion::LegacyUtf16
                .encode(&google_private_key_json())
                .len()
                > MAX_CREDENTIAL_BLOB_SIZE
        );
    }

    #[test]
    fn round_trips_google_private_key() {
        let key = google_private_key_json();

        let blob = encode_credential_blob(&key).unwrap();

        assert_eq!(
            decode_credential_blob(&blob).unwrap(),
            (key, BlobVersion::CURRENT)
        );
    }

    #[test]
    fn round_trips_non_ascii_values() {
        let value = "\"pässwörd 漢字 🔑\"";

        let blob = encode_credential_blob(value).unwrap();

        assert_eq!(
            decode_credential_blob(&blob).unwrap(),
            (value.to_owned(), BlobVersion::CURRENT)
        );
    }

    #[test]
    fn round_trips_empty_values() {
        let blob = encode_credential_blob("").unwrap();

        assert_eq!(
            decode_credential_blob(&blob).unwrap(),
            (String::new(), BlobVersion::CURRENT)
        );
    }

    #[test]
    fn decodes_legacy_utf8_blobs_written_by_keytar() {
        let value = "\"pässwörd 漢字 🔑\"";

        assert_eq!(
            decode_credential_blob(value.as_bytes()).unwrap(),
            (value.to_owned(), BlobVersion::LegacyUtf8)
        );
    }

    #[test]
    fn decodes_legacy_utf16_blobs_written_by_desktop_core() {
        let value = "\"secret\"";

        assert_eq!(
            decode_credential_blob(&desktop_core_blob(value, &[])).unwrap(),
            (value.to_owned(), BlobVersion::LegacyUtf16)
        );
    }

    #[test]
    fn decodes_desktop_core_blob_that_ends_in_its_nul_terminator() {
        // One 2-byte character, so the blob is one unit too long: the terminator. Without stopping
        // at the NUL this decodes to "\"pässword\"\0", which JSON.parse rejects.
        let value = "\"pässword\"";
        let blob = desktop_core_blob(value, &[]);

        assert_eq!(
            decode_credential_blob(&blob).unwrap(),
            (value.to_owned(), BlobVersion::LegacyUtf16)
        );
    }

    #[test]
    fn decodes_desktop_core_blob_that_runs_past_its_buffer() {
        // Three 2-byte characters, so the blob runs two units past the terminator. If that memory
        // holds a lone surrogate (0xD800), decoding the whole blob fails and getPassword throws.
        let value = "\"äöü\"";
        let blob = desktop_core_blob(value, &[0xD800, 0x0041]);

        assert_eq!(
            decode_credential_blob(&blob).unwrap(),
            (value.to_owned(), BlobVersion::LegacyUtf16)
        );
    }

    #[test]
    fn decodes_empty_blob_as_empty_legacy_value() {
        assert_eq!(
            decode_credential_blob(&[]).unwrap(),
            (String::new(), BlobVersion::LegacyUtf8)
        );
    }

    #[test]
    fn rejects_unsupported_versions() {
        let err = decode_credential_blob(&[VERSION_MARKER, 2, b'a']).unwrap_err();

        assert!(err.to_string().contains("unsupported format version 2"));
    }

    #[test]
    fn rejects_values_over_the_size_limit() {
        let value = "a".repeat(MAX_CREDENTIAL_BLOB_SIZE - HEADER_LEN + 1);

        let err = encode_credential_blob(&value).unwrap_err();

        assert!(err.to_string().contains("too large"));
    }

    #[test]
    fn accepts_values_at_the_size_limit() {
        let value = "a".repeat(MAX_CREDENTIAL_BLOB_SIZE - HEADER_LEN);

        assert!(encode_credential_blob(&value).is_ok());
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
    fn rejects_invalid_utf8_in_legacy_blobs() {
        assert!(decode_credential_blob(&[0xff, 0xfe, 0xfd]).is_err());
    }

    #[test]
    fn rejects_invalid_utf8_in_v1_blobs() {
        assert!(decode_credential_blob(&[VERSION_MARKER, V1_HEADER, 0xff, 0xfe]).is_err());
    }
}
