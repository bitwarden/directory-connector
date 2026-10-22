//! Encoding of secrets stored as Windows Credential Manager blobs.
//!
//! Secrets are written as UTF-16, as desktop_core writes them, so earlier versions of Directory
//! Connector can still read them after a downgrade. Credential Manager caps blobs at 2560 bytes,
//! which is less than a Google Workspace private key needs as UTF-16; values that don't fit are
//! written as `BlobVersion::V1` (UTF-8) instead. Earlier versions could never save such values, so
//! nothing they could read is lost.
//!
//! Blobs without a header (keytar UTF-8, desktop_core UTF-16) are told apart by their content. To
//! add a version, add a `BlobFormat`, a `BlobVersion` variant and header number, and update
//! `BlobVersion::for_value`. Never change or reuse an existing version.

use anyhow::{anyhow, bail, Result};

/// `CRED_MAX_CREDENTIAL_BLOB_SIZE` from wincred.h.
pub const MAX_CREDENTIAL_BLOB_SIZE: usize = 5 * 512;

/// Never the first byte of a headerless blob, as stored values are JSON and start with printable
/// ASCII.
const VERSION_MARKER: u8 = 0x01;

const V1_HEADER: u8 = 1;

trait BlobFormat {
    fn encode(value: &str) -> Vec<u8>;
    fn decode(payload: &[u8]) -> Result<String>;
}

struct Utf8Format;

impl BlobFormat for Utf8Format {
    fn encode(value: &str) -> Vec<u8> {
        value.as_bytes().to_vec()
    }

    fn decode(payload: &[u8]) -> Result<String> {
        let value = std::str::from_utf8(payload)
            .map_err(|_| anyhow!("Credential blob is not valid UTF-8."))?;
        Ok(value.to_owned())
    }
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
    /// No header. Written by keytar; no longer written.
    Utf8,
    /// No header. Written by desktop_core, and by Directory Connector for values that fit.
    Utf16,
    /// A `[VERSION_MARKER, V1_HEADER]` header followed by UTF-8. Written by Directory Connector for
    /// values too large for UTF-16, such as Google Workspace private keys. Earlier versions of
    /// Directory Connector cannot read it.
    V1,
}

impl BlobVersion {
    /// The version `value` is saved as.
    pub fn for_value(value: &str) -> Self {
        if value.encode_utf16().count() * 2 <= MAX_CREDENTIAL_BLOB_SIZE {
            Self::Utf16
        } else {
            Self::V1
        }
    }

    /// Encodes `value` as this version, including its header.
    pub fn encode(self, value: &str) -> Result<Vec<u8>> {
        let blob = match self {
            Self::Utf8 => Utf8Format::encode(value),
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

    /// Detects the version of `blob` and decodes it. The version is returned so that migrations
    /// can tell whether a blob needs rewriting.
    pub fn decode(blob: &[u8]) -> Result<(String, Self)> {
        let (version, payload) = Self::detect(blob)?;
        let value = match version {
            Self::Utf8 => Utf8Format::decode(payload),
            Self::Utf16 => Utf16Format::decode(payload),
            Self::V1 => V1Format::decode(payload),
        }?;
        Ok((value, version))
    }

    /// UTF-16 blobs contain a NUL byte per ASCII character; keytar's UTF-8 JSON never does.
    fn detect(blob: &[u8]) -> Result<(Self, &[u8])> {
        match blob {
            [VERSION_MARKER, version, payload @ ..] => match *version {
                V1_HEADER => Ok((Self::V1, payload)),
                version => bail!(
                    "Credential blob has unsupported format version {}. It may have been saved by a newer version of Directory Connector.",
                    version
                ),
            },
            _ if blob.contains(&0) => Ok((Self::Utf16, blob)),
            _ => Ok((Self::Utf8, blob)),
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

    fn save(value: &str) -> Vec<u8> {
        BlobVersion::for_value(value).encode(value).unwrap()
    }

    #[test]
    fn saves_values_that_fit_as_utf16() {
        let value = "{\"password\":\"pässwörd\"}";

        assert_eq!(BlobVersion::for_value(value), BlobVersion::Utf16);
        assert_eq!(save(value), Utf16Format::encode(value));
    }

    #[test]
    fn saves_google_private_key_as_v1() {
        let key = google_private_key_json();

        let blob = save(&key);

        assert_eq!(BlobVersion::for_value(&key), BlobVersion::V1);
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
    fn saves_values_at_the_utf16_size_limit_as_utf16() {
        let value = "a".repeat(MAX_CREDENTIAL_BLOB_SIZE / 2);

        assert_eq!(BlobVersion::for_value(&value), BlobVersion::Utf16);
        assert_eq!(
            BlobVersion::for_value(&format!("{}a", value)),
            BlobVersion::V1
        );
    }

    #[test]
    fn utf16_blobs_are_readable_by_desktop_core() {
        for value in ["\"secret\"", "\"pässwörd 漢字 🔑\""] {
            assert_eq!(desktop_core_read(&save(value)), value);
        }
    }

    #[test]
    fn round_trips_values() {
        let values = [
            "\"secret\"".to_owned(),
            "\"pässwörd 漢字 🔑\"".to_owned(),
            google_private_key_json(),
        ];

        for value in values {
            let version = BlobVersion::for_value(&value);

            assert_eq!(
                BlobVersion::decode(&save(&value)).unwrap(),
                (value, version)
            );
        }
    }

    #[test]
    fn round_trips_empty_values() {
        let (value, _) = BlobVersion::decode(&save("")).unwrap();

        assert_eq!(value, "");
    }

    #[test]
    fn round_trips_each_version() {
        let value = "\"pässwörd 漢字 🔑\"";

        for version in [BlobVersion::Utf8, BlobVersion::Utf16, BlobVersion::V1] {
            let blob = version.encode(value).unwrap();

            assert_eq!(
                BlobVersion::decode(&blob).unwrap(),
                (value.to_owned(), version)
            );
        }
    }

    #[test]
    fn decodes_utf8_blobs_written_by_keytar() {
        let value = "\"pässwörd 漢字 🔑\"";

        assert_eq!(
            BlobVersion::decode(value.as_bytes()).unwrap(),
            (value.to_owned(), BlobVersion::Utf8)
        );
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
    fn reads_and_resaves_secrets_after_the_keytar_migration() {
        let values = [
            "\"secret\"".to_owned(),
            "\"pässwörd 漢字 🔑\"".to_owned(),
            "{\"password\":\"äöü\",\"url\":\"ldaps://ldap.example.com\"}".to_owned(),
            google_private_key_json(),
        ];

        for value in values {
            // The migration rewrote keytar blobs through desktop_core, leaving them as they were
            // if the result was over the size limit.
            let migrated = desktop_core_blob(&value, &vec![0xD800; value.len()]);
            let stored = if migrated.len() <= MAX_CREDENTIAL_BLOB_SIZE {
                migrated
            } else {
                value.as_bytes().to_vec()
            };

            let (read, _) = BlobVersion::decode(&stored).unwrap();
            let resaved = save(&read);

            assert_eq!(read, value);
            assert_eq!(
                BlobVersion::decode(&resaved).unwrap(),
                (value.clone(), BlobVersion::for_value(&value))
            );
        }
    }

    #[test]
    fn decodes_empty_blob_as_empty_value() {
        assert_eq!(
            BlobVersion::decode(&[]).unwrap(),
            (String::new(), BlobVersion::Utf8)
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

        let err = BlobVersion::for_value(&value).encode(&value).unwrap_err();

        assert!(err.to_string().contains("too large"));
    }

    #[test]
    fn accepts_values_at_the_size_limit() {
        let value = "a".repeat(MAX_CREDENTIAL_BLOB_SIZE - HEADER_LEN);

        assert!(BlobVersion::for_value(&value).encode(&value).is_ok());
    }

    #[test]
    fn size_error_does_not_include_the_secret() {
        let value = "s3cret".repeat(MAX_CREDENTIAL_BLOB_SIZE);

        let err = BlobVersion::for_value(&value).encode(&value).unwrap_err();

        assert!(!err.to_string().contains("s3cret"));
    }

    #[test]
    fn rejects_odd_length_blobs_containing_nul() {
        assert!(BlobVersion::decode(&[b'a', 0, b'b']).is_err());
    }

    #[test]
    fn rejects_invalid_utf8_in_keytar_blobs() {
        assert!(BlobVersion::decode(&[0xff, 0xfe, 0xfd]).is_err());
    }

    #[test]
    fn rejects_invalid_utf8_in_v1_blobs() {
        assert!(BlobVersion::decode(&[VERSION_MARKER, V1_HEADER, 0xff, 0xfe]).is_err());
    }
}
