import * as crypto from "crypto";

import { EntraIdConfiguration } from "@/libs/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/libs/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/libs/models/ldapConfiguration";
import { OktaConfiguration } from "@/libs/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/libs/models/oneLoginConfiguration";

/**
 * `data.json` can be freely copied between machines/environments to manage multiple
 * directory configurations (e.g. one per AD domain or service account) - this is a
 * documented, supported workflow. However, secrets (passwords, API keys, tokens, etc.)
 * are never written to `data.json`; they live in OS-native secure storage (Windows
 * Credential Manager, macOS Keychain, libsecret, etc.) under a single fixed key per
 * directory type.
 *
 * Because that key was not tied to *which* configuration it belonged to, swapping in
 * a different `data.json` would correctly restore the non-secret fields (hostname,
 * username, tenant, etc.) but the secure-storage lookup would still return whichever
 * secret was most recently saved on that machine - silently mixing the username from
 * one configuration with the secret from another.
 *
 * To fix this, secure storage keys are suffixed with a hash derived from the
 * non-secret fields that identify a given configuration. Distinct configurations
 * (e.g. two AD service accounts, or two Okta orgs) each get their own slot in secure
 * storage, so switching `data.json` files also switches which secret is read back.
 */
function identitySuffix(parts: (string | null | undefined)[]): string {
  const normalized = parts.map((part) => (part ?? "").trim().toLowerCase()).join("\u0000");
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 16);
}

export function ldapSecretSuffix(
  config: Pick<LdapConfiguration, "hostname" | "domain" | "username"> | null | undefined,
): string {
  return identitySuffix([config?.hostname, config?.domain, config?.username]);
}

export function entraSecretSuffix(
  config: Pick<EntraIdConfiguration, "tenant" | "applicationId"> | null | undefined,
): string {
  return identitySuffix([config?.tenant, config?.applicationId]);
}

export function oktaSecretSuffix(
  config: Pick<OktaConfiguration, "orgUrl"> | null | undefined,
): string {
  return identitySuffix([config?.orgUrl]);
}

export function gsuiteSecretSuffix(
  config: Pick<GSuiteConfiguration, "clientEmail" | "domain" | "customer"> | null | undefined,
): string {
  return identitySuffix([config?.clientEmail, config?.domain, config?.customer]);
}

export function oneLoginSecretSuffix(
  config: Pick<OneLoginConfiguration, "clientId" | "region"> | null | undefined,
): string {
  return identitySuffix([config?.clientId, config?.region]);
}
