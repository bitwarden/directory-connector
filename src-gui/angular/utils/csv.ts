/**
 * Builds RFC 4180 CSV text from rows of cells.
 *
 * Values come from external directories, so cells that a spreadsheet would treat as a formula
 * (starting with =, +, -, @, tab or carriage return) are prefixed with a single quote to prevent
 * CSV injection when the file is opened in Excel, Numbers or Sheets.
 */
export function toCsv(
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>,
): string {
  return rows.map((row) => row.map(formatCell).join(",")).join("\r\n") + "\r\n";
}

function formatCell(value: string | number | null | undefined): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = "'" + text;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Offers `content` to the user as a file download. */
export function downloadFile(fileName: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
