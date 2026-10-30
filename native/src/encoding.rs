//! Encoding of secrets stored as Windows Credential Manager blobs by the `v_next` password
//! functions, which are only used for the Google Workspace private key.
//!
//! Credential Manager caps blobs at 2560 bytes, which is less than a Google Workspace private key
//! needs as UTF-16 (the encoding desktop_core writes). `v_next` therefore always writes
//! `BlobVersion::V1`: a header followed by UTF-8. Blobs without a header are UTF-16, as written by
//! desktop_core.
//!
//! To add a version, add a `BlobFormat`, a `BlobVersion` variant and header number, and update
//! `BlobVersion::LATEST`. Never change or reuse an existing version.

use anyhow::{anyhow, bail, Result};

/// `CRED_MAX_CREDENTIAL_BLOB_SIZE` from wincred.h.
pub const MAX_CREDENTIAL_BLOB_SIZE: usize = 5 * 512;

/// Never the first byte of a UTF-16 blob, as stored values are JSON and start with printable
/// ASCII.
const VERSION_MARKER: u8 = 0x01;

const V1_HEADER: u8 = 1;

trait BlobFormat {
    fn encode(value: &str) -> Vec<u8>;
    fn decode(payload: &[u8]) -> Result<String>;
}

struct Utf16Format;

impl BlobFormat for Utf16Format {
    /// Unlike desktop_core, sized by UTF-16 length, so non-ASCII values are stored without a
    /// terminator or trailing memory. desktop_core reads these back unchanged.
    fn encode(value: &str) -> Vec<u8> {
        value.encode_utf16().flat_map(u16::to_le_bytes).collect()
    }

    /// Stops at the NUL terminator: desktop_core sized blobs by UTF-8 length, so non-ASCII values
    /// were stored with the terminator and whatever memory followed it.
    fn decode(payload: &[u8]) -> Result<String> {
        if !payload.len().is_multiple_of(2) {
            bail!("Credential blob is not valid UTF-16.");
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
    /// No header. Written by desktop_core.
    Utf16,
    /// A `[VERSION_MARKER, V1_HEADER]` header followed by UTF-8. Earlier versions of Directory
    /// Connector cannot read it.
    V1,
}

impl BlobVersion {
    /// The version `v_next` writes.
    pub const LATEST: Self = Self::V1;

    /// Encodes `value` as this version, including its header.
    pub fn encode(self, value: &str) -> Result<Vec<u8>> {
        let blob = match self {
            Self::Utf16 => Utf16Format::encode(value),
            Self::V1 => [&[VERSION_MARKER, V1_HEADER][..], &V1Format::encode(value)].concat(),
        };
        if blob.len() > MAX_CREDENTIAL_BLOB_SIZE {
            bail!(
                "Secret is too large for Windows Credential Manager ({} bytes, maximum is {}).",
                blob.len(),
                MAX_CREDENTIAL_BLOB_SIZE
            );
        }
        Ok(blob)
    }

    /// Detects the version of `blob` from its header and decodes it.
    pub fn decode(blob: &[u8]) -> Result<(String, Self)> {
        let (version, payload) = Self::detect(blob)?;
        let value = match version {
            Self::Utf16 => Utf16Format::decode(payload),
            Self::V1 => V1Format::decode(payload),
        }?;
        Ok((value, version))
    }

    fn detect(blob: &[u8]) -> Result<(Self, &[u8])> {
        match blob {
            [VERSION_MARKER, version, payload @ ..] => match *version {
                V1_HEADER => Ok((Self::V1, payload)),
                version => bail!(
                    "Credential blob has unsupported format version {}. It may have been saved by a newer version of Directory Connector.",
                    version
                ),
            },
            _ => Ok((Self::Utf16, blob)),
        }
    }
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

    /// How desktop_core reads a blob: `size / 2` UTF-16 units, lossily.
    fn desktop_core_read(blob: &[u8]) -> String {
        let units: Vec<u16> = blob
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .collect();
        String::from_utf16_lossy(&units)
    }

    #[test]
    fn latest_version_is_v1() {
        assert_eq!(BlobVersion::LATEST, BlobVersion::V1);
    }

    #[test]
    fn encodes_google_private_key_as_v1() {
        let key = google_private_key_json();

        let blob = BlobVersion::V1.encode(&key).unwrap();

        assert_eq!(&blob[..HEADER_LEN], &[VERSION_MARKER, V1_HEADER]);
        assert_eq!(&blob[HEADER_LEN..], key.as_bytes());
        assert!(blob.len() <= MAX_CREDENTIAL_BLOB_SIZE);
    }

    #[test]
    fn google_private_key_does_not_fit_as_utf16() {
        assert!(BlobVersion::Utf16
            .encode(&google_private_key_json())
            .is_err());
    }

    #[test]
    fn utf16_blobs_are_readable_by_desktop_core() {
        for value in ["\"secret\"", "\"pässwörd 漢字 🔑\""] {
            let blob = BlobVersion::Utf16.encode(value).unwrap();

            assert_eq!(desktop_core_read(&blob), value);
        }
    }

    #[test]
    fn round_trips_each_version() {
        let value = "\"pässwörd 漢字 🔑\"";

        for version in [BlobVersion::Utf16, BlobVersion::V1] {
            let blob = version.encode(value).unwrap();

            assert_eq!(
                BlobVersion::decode(&blob).unwrap(),
                (value.to_owned(), version)
            );
        }
    }

    #[test]
    fn round_trips_google_private_key() {
        let key = google_private_key_json();
        let blob = BlobVersion::LATEST.encode(&key).unwrap();

        assert_eq!(BlobVersion::decode(&blob).unwrap(), (key, BlobVersion::V1));
    }

    #[test]
    fn round_trips_empty_values() {
        for version in [BlobVersion::Utf16, BlobVersion::V1] {
            let blob = version.encode("").unwrap();

            assert_eq!(
                BlobVersion::decode(&blob).unwrap(),
                (String::new(), version)
            );
        }
    }

    #[test]
    fn decodes_utf16_blobs_written_by_desktop_core() {
        let value = "\"secret\"";

        assert_eq!(
            BlobVersion::decode(&desktop_core_blob(value, &[])).unwrap(),
            (value.to_owned(), BlobVersion::Utf16)
        );
    }

    #[test]
    fn decodes_desktop_core_blob_that_ends_in_its_nul_terminator() {
        // One 2-byte character: the blob includes the terminator.
        let value = "\"pässword\"";
        let blob = desktop_core_blob(value, &[]);

        assert_eq!(
            BlobVersion::decode(&blob).unwrap(),
            (value.to_owned(), BlobVersion::Utf16)
        );
    }

    #[test]
    fn decodes_desktop_core_blob_that_runs_past_its_buffer() {
        // Three 2-byte characters: the blob runs past the terminator, here into a lone surrogate.
        let value = "\"äöü\"";
        let blob = desktop_core_blob(value, &[0xD800, 0x0041]);

        assert_eq!(
            BlobVersion::decode(&blob).unwrap(),
            (value.to_owned(), BlobVersion::Utf16)
        );
    }

    #[test]
    fn decodes_empty_blob_as_empty_value() {
        assert_eq!(
            BlobVersion::decode(&[]).unwrap(),
            (String::new(), BlobVersion::Utf16)
        );
    }

    #[test]
    fn rejects_unsupported_versions() {
        let err = BlobVersion::decode(&[VERSION_MARKER, 2, b'a']).unwrap_err();

        assert!(err.to_string().contains("unsupported format version 2"));
    }

    #[test]
    fn rejects_values_over_the_size_limit() {
        let value = "a".repeat(MAX_CREDENTIAL_BLOB_SIZE - HEADER_LEN + 1);

        let err = BlobVersion::V1.encode(&value).unwrap_err();

        assert!(err.to_string().contains("too large"));
    }

    #[test]
    fn accepts_values_at_the_size_limit() {
        let value = "a".repeat(MAX_CREDENTIAL_BLOB_SIZE - HEADER_LEN);

        assert!(BlobVersion::V1.encode(&value).is_ok());
    }

    #[test]
    fn size_error_does_not_include_the_secret() {
        let value = "s3cret".repeat(MAX_CREDENTIAL_BLOB_SIZE);

        let err = BlobVersion::V1.encode(&value).unwrap_err();

        assert!(!err.to_string().contains("s3cret"));
    }

    #[test]
    fn rejects_odd_length_utf16_blobs() {
        assert!(BlobVersion::decode(&[b'a', 0, b'b']).is_err());
    }

    #[test]
    fn rejects_invalid_utf8_in_v1_blobs() {
        assert!(BlobVersion::decode(&[VERSION_MARKER, V1_HEADER, 0xff, 0xfe]).is_err());
    }
}
