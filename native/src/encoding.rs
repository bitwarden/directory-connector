//! Encoding of secrets stored as Windows Credential Manager blobs.
//!
//! desktop_core stores blobs as UTF-16, which doubles the size of ASCII text. Credential Manager
//! caps blobs at 2560 bytes, which is less than a Google Workspace private key needs as UTF-16, so
//! blobs are written as UTF-8 instead.
//!
//! Legacy blobs (keytar UTF-8, desktop_core UTF-16) have no header and are still read; each is
//! rewritten as `BlobVersion::CURRENT` the next time it is saved. To add a version, add a
//! `BlobFormat`, a `BlobVersion` variant and header number, and update `CURRENT`. Never change or
//! reuse an existing version.

use anyhow::{anyhow, bail, Result};

/// `CRED_MAX_CREDENTIAL_BLOB_SIZE` from wincred.h.
pub const MAX_CREDENTIAL_BLOB_SIZE: usize = 5 * 512;

/// Never the first byte of a legacy blob, as stored values are JSON and start with printable ASCII.
const VERSION_MARKER: u8 = 0x01;

const V1_HEADER: u8 = 1;

trait BlobFormat {
    fn encode(value: &str) -> Vec<u8>;
    fn decode(payload: &[u8]) -> Result<String>;
}

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

struct LegacyUtf16Format;

impl BlobFormat for LegacyUtf16Format {
    fn encode(value: &str) -> Vec<u8> {
        value.encode_utf16().flat_map(u16::to_le_bytes).collect()
    }

    /// Stops at the NUL terminator: desktop_core sized blobs by UTF-8 length, so non-ASCII values
    /// were stored with the terminator and whatever memory followed it.
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
    /// Written by keytar.
    LegacyUtf8,
    /// Written by desktop_core.
    LegacyUtf16,
    V1,
}

impl BlobVersion {
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

    /// Legacy UTF-16 blobs contain a NUL byte per ASCII character; legacy UTF-8 JSON never does.
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

pub fn decode_credential_blob(blob: &[u8]) -> Result<(String, BlobVersion)> {
    let (version, payload) = BlobVersion::detect(blob)?;
    Ok((version.decode(payload)?, version))
}

#[cfg(test)]
mod tests {
    use super::*;

    const HEADER_LEN: usize = 2;

    /// The size of a real Google Workspace service account key (~1730 chars) as stored JSON.
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

    /// How desktop_core stored a blob: UTF-16 plus its NUL terminator, cut to `value.len() * 2`
    /// bytes. `past_buffer` stands in for the memory read past the end of the buffer.
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
        // One 2-byte character: the blob includes the terminator.
        let value = "\"pässword\"";
        let blob = desktop_core_blob(value, &[]);

        assert_eq!(
            decode_credential_blob(&blob).unwrap(),
            (value.to_owned(), BlobVersion::LegacyUtf16)
        );
    }

    #[test]
    fn decodes_desktop_core_blob_that_runs_past_its_buffer() {
        // Three 2-byte characters: the blob runs past the terminator, here into a lone surrogate.
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
