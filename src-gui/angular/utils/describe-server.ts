export type ServerKind = "cloudUs" | "cloudEu" | "selfHosted";

/**
 * Classifies the Bitwarden server Directory Connector syncs to, from its API URL.
 * Returns the host for self-hosted servers so it can be shown to the user.
 */
export function describeServer(apiUrl: string | null | undefined): {
  kind: ServerKind;
  host: string;
} {
  let host = "";
  try {
    host = new URL(apiUrl ?? "").hostname.toLowerCase();
  } catch {
    return { kind: "selfHosted", host: apiUrl ?? "" };
  }

  if (host === "bitwarden.com" || host.endsWith(".bitwarden.com")) {
    return { kind: "cloudUs", host };
  }
  if (host === "bitwarden.eu" || host.endsWith(".bitwarden.eu")) {
    return { kind: "cloudEu", host };
  }
  return { kind: "selfHosted", host };
}
