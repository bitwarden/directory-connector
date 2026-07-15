import * as crypto from "crypto";

import { EntraIdConfiguration } from "@/libs/models/entraIdConfiguration";
import { GSuiteConfiguration } from "@/libs/models/gsuiteConfiguration";
import { LdapConfiguration } from "@/libs/models/ldapConfiguration";
import { OktaConfiguration } from "@/libs/models/oktaConfiguration";
import { OneLoginConfiguration } from "@/libs/models/oneLoginConfiguration";

/**
 * `data.json` can be freely copied between machines/environments to manage multiple directory
 * configurations (e.g. one per AD domain or service account) - this is a documented, supported
 * workflow. However, secrets (passwords, API keys, tokens, etc.) are never written to
 * `data.json`; they live in OS-native secure storage (Windows Credential Manager, macOS
 * Keychain, libsecret, etc.) under a single fixed key per directory type.
 *
 * Because that key was not tied to *which* configuration it belonged to, swapping in a
 * different `data.json` would correctly restore the non-secret fields (hostname, username,
 * tenant, etc.) but the secure-storage lookup would still return whichever secret was most
 * recently saved on that machine - silently mixing the username from one configuration with the
 * secret from another.
 *
 * The fix: each configuration carries its own randomly-generated `id`, and secure storage keys
 * are suffixed with that `id`. Distinct configurations (e.g. two AD service accounts, or two
 * Okta orgs pointed at the same Bitwarden organization) each get their own slot in secure
 * storage, so switching `data.json` files also switches which secret is read back. The `id` is
 * intentionally *not* derived from the Bitwarden organization id - customers may legitimately
 * run multiple directory configurations (different directories/service accounts) against the
 * same organization, and those must not collide either.
 *
 * The `id` is kept stable across saves as long as the configuration's identity (the fields
 * below) hasn't changed, so routine actions like rotating a password for the same account
 * update the existing secure-storage slot in place rather than minting a new one every time
 * settings are saved.
 */
export function generateConfigId(): string {
  return crypto.randomUUID();
}

function fieldsMatch(a: unknown, b: unknown): boolean {
  return (a ?? null) === (b ?? null);
}

export function ldapConfigsShareIdentity(
  previous: Pick<LdapConfiguration, "hostname" | "domain" | "username"> | null | undefined,
  next: Pick<LdapConfiguration, "hostname" | "domain" | "username"> | null | undefined,
): boolean {
  return (
    previous != null &&
    fieldsMatch(previous.hostname, next?.hostname) &&
    fieldsMatch(previous.domain, next?.domain) &&
    fieldsMatch(previous.username, next?.username)
  );
}

export function entraConfigsShareIdentity(
  previous: Pick<EntraIdConfiguration, "tenant" | "applicationId"> | null | undefined,
  next: Pick<EntraIdConfiguration, "tenant" | "applicationId"> | null | undefined,
): boolean {
  return (
    previous != null &&
    fieldsMatch(previous.tenant, next?.tenant) &&
    fieldsMatch(previous.applicationId, next?.applicationId)
  );
}

export function oktaConfigsShareIdentity(
  previous: Pick<OktaConfiguration, "orgUrl"> | null | undefined,
  next: Pick<OktaConfiguration, "orgUrl"> | null | undefined,
): boolean {
  return previous != null && fieldsMatch(previous.orgUrl, next?.orgUrl);
}

export function gsuiteConfigsShareIdentity(
  previous: Pick<GSuiteConfiguration, "clientEmail" | "domain" | "customer"> | null | undefined,
  next: Pick<GSuiteConfiguration, "clientEmail" | "domain" | "customer"> | null | undefined,
): boolean {
  return (
    previous != null &&
    fieldsMatch(previous.clientEmail, next?.clientEmail) &&
    fieldsMatch(previous.domain, next?.domain) &&
    fieldsMatch(previous.customer, next?.customer)
  );
}

export function oneLoginConfigsShareIdentity(
  previous: Pick<OneLoginConfiguration, "clientId" | "region"> | null | undefined,
  next: Pick<OneLoginConfiguration, "clientId" | "region"> | null | undefined,
): boolean {
  return (
    previous != null &&
    fieldsMatch(previous.clientId, next?.clientId) &&
    fieldsMatch(previous.region, next?.region)
  );
}
