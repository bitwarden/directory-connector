import * as program from "commander";

import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { NodeUtils } from "@/jslib/common/src/misc/nodeUtils";
import { Response } from "@/jslib/node/src/cli/models/response";
import { MessageResponse } from "@/jslib/node/src/cli/models/response/messageResponse";

import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";
import { EntraIdConfiguration } from "../models/entraIdConfiguration";
import { GSuiteConfiguration } from "../models/gsuiteConfiguration";
import { LdapConfiguration } from "../models/ldapConfiguration";
import { OktaConfiguration } from "../models/oktaConfiguration";
import { OneLoginConfiguration } from "../models/oneLoginConfiguration";
import { SyncConfiguration } from "../models/syncConfiguration";
import { ConnectorUtils } from "../utils";

export class ConfigCommand {
  private directory: DirectoryType;
  private ldap = new LdapConfiguration();
  private gsuite = new GSuiteConfiguration();
  private entra = new EntraIdConfiguration();
  private okta = new OktaConfiguration();
  private oneLogin = new OneLoginConfiguration();
  private sync = new SyncConfiguration();

  constructor(
    private environmentService: EnvironmentService,
    private i18nService: I18nService,
    private stateService: StateService,
  ) {}

  async run(setting: string, value: string, options: program.OptionValues): Promise<Response> {
    setting = (setting || "").toLowerCase();

    // Support secretenv/secretfile for any setting (primarily secrets like ldap.password).
    if (value == null || value === "") {
      if (options.secretfile) {
        value = await NodeUtils.readFirstLine(options.secretfile);
      } else if (options.secretenv && process.env[options.secretenv]) {
        value = process.env[options.secretenv];
      }
    }

    try {
      switch (setting) {
        // Global
        case "server":
          await this.setServer(value);
          break;
        case "directory":
          await this.setDirectory(value);
          break;

        // LDAP core
        case "ldap.hostname":
          await this.setLdapHostname(value);
          break;
        case "ldap.port":
          await this.setLdapPort(value);
          break;
        case "ldap.rootpath":
          await this.setLdapRootPath(value);
          break;
        case "ldap.domain":
          await this.setLdapDomain(value);
          break;
        case "ldap.currentuser":
          await this.setLdapCurrentUser(value);
          break;
        case "ldap.username":
          await this.setLdapUsername(value);
          break;
        case "ldap.password":
          await this.setLdapPassword(value);
          break;

        // LDAP TLS/paging
        case "ldap.ssl":
          await this.setLdapSsl(value);
          break;
        case "ldap.starttls":
          await this.setLdapStartTls(value);
          break;
        case "ldap.tlscapath":
          await this.setLdapTlsCaPath(value);
          break;
        case "ldap.sslcapath":
          await this.setLdapSslCaPath(value);
          break;
        case "ldap.sslcertpath":
          await this.setLdapSslCertPath(value);
          break;
        case "ldap.sslkeypath":
          await this.setLdapSslKeyPath(value);
          break;
        case "ldap.sslallowunauthorized":
          await this.setLdapSslAllowUnauthorized(value);
          break;
        case "ldap.pagedsearch":
          await this.setLdapPagedSearch(value);
          break;
        case "ldap.ad":
          await this.setLdapAd(value);
          break;

        // LDAP Kerberos/ldapsearch (custom additions)
        case "ldap.auth":
          await this.setLdapAuth(value);
          break;
        case "ldap.kerberos.principal":
          await this.setLdapKerberosPrincipal(value);
          break;
        case "ldap.kerberos.keytab":
          await this.setLdapKerberosKeytab(value);
          break;
        case "ldap.kerberos.ccache":
          await this.setLdapKerberosCcache(value);
          break;
        case "ldap.kerberos.mechanism":
          await this.setLdapKerberosMechanism(value);
          break;
        case "ldap.ldapsearch.path":
          await this.setLdapLdapsearchPath(value);
          break;

        // Sync settings
        case "sync.users":
          await this.setSyncUsers(value);
          break;
        case "sync.groups":
          await this.setSyncGroups(value);
          break;
        case "sync.interval":
          await this.setSyncInterval(value);
          break;
        case "sync.userfilter":
          await this.setSyncUserFilter(value);
          break;
        case "sync.groupfilter":
          await this.setSyncGroupFilter(value);
          break;
        case "sync.removedisabled":
          await this.setSyncRemoveDisabled(value);
          break;
        case "sync.overwriteexisting":
          await this.setSyncOverwriteExisting(value);
          break;
        case "sync.largeimport":
          await this.setSyncLargeImport(value);
          break;

        // Sync LDAP-specific knobs
        // Note: ConnectorUtils.adjustConfigForSave will force AD defaults when ldap.ad === true.
        // If you need these to persist as custom values, set ldap.ad=false.
        case "sync.userobjectclass":
          await this.setSyncUserObjectClass(value);
          break;
        case "sync.groupobjectclass":
          await this.setSyncGroupObjectClass(value);
          break;
        case "sync.userpath":
          await this.setSyncUserPath(value);
          break;
        case "sync.grouppath":
          await this.setSyncGroupPath(value);
          break;
        case "sync.groupnameattribute":
          await this.setSyncGroupNameAttribute(value);
          break;
        case "sync.useremailattribute":
          await this.setSyncUserEmailAttribute(value);
          break;
        case "sync.memberattribute":
          await this.setSyncMemberAttribute(value);
          break;
        case "sync.useemailprefixsuffix":
          await this.setSyncUseEmailPrefixSuffix(value);
          break;
        case "sync.emailprefixattribute":
          await this.setSyncEmailPrefixAttribute(value);
          break;
        case "sync.emailsuffix":
          await this.setSyncEmailSuffix(value);
          break;
        case "sync.creationdateattribute":
          await this.setSyncCreationDateAttribute(value);
          break;
        case "sync.revisiondateattribute":
          await this.setSyncRevisionDateAttribute(value);
          break;

        // Other directories
        case "gsuite.key":
          await this.setGSuiteKey(value);
          break;
        // Azure Active Directory was renamed to Entra ID, but we've kept the old key name
        // to be backwards compatible with existing configurations.
        case "azure.key":
        case "entra.key":
          await this.setEntraIdKey(value);
          break;
        case "okta.token":
          await this.setOktaToken(value);
          break;
        case "onelogin.secret":
          await this.setOneLoginSecret(value);
          break;

        default:
          return Response.badRequest("Unknown setting.");
      }
    } catch (e) {
      return Response.error(e);
    }

    const res = new MessageResponse(this.i18nService.t("savedSetting", setting), null);
    return Response.success(res);
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  private parseBoolean(value: string, settingName: string): boolean {
    const v = (value || "").trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(v)) {
      return true;
    }
    if (["false", "0", "no", "n", "off"].includes(v)) {
      return false;
    }
    throw new Error(`Invalid ${settingName} value. Use true/false.`);
  }

  private parseNullableString(value: string): string {
    if (value == null) {
      return null;
    }
    const v = value.trim();
    if (v.toLowerCase() === "null") {
      return null;
    }
    return v;
  }

  private parseNullableInt(value: string, settingName: string): number {
    const v = this.parseNullableString(value);
    if (v == null) {
      return null;
    }
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid ${settingName} value. Must be an integer (or "null").`);
    }
    return n;
  }

  // -----------------------------
  // Global
  // -----------------------------

  private async setServer(url: string) {
    url = url === "null" || url === "bitwarden.com" || url === "https://bitwarden.com" ? null : url;
    await this.environmentService.setUrls({
      base: url,
    });
  }

  private async setDirectory(type: string) {
    const dir = parseInt(type, null);
    if (dir < DirectoryType.Ldap || dir > DirectoryType.OneLogin) {
      throw new Error("Invalid directory type value.");
    }
    await this.loadConfig();
    this.directory = dir;
    await this.saveConfig();
  }

  // -----------------------------
  // LDAP core
  // -----------------------------

  private async setLdapHostname(hostname: string) {
    const v = this.parseNullableString(hostname);
    if (v != null && v.length === 0) {
      throw new Error('ldap.hostname cannot be empty (use "null" to clear).');
    }
    await this.loadConfig();
    this.ldap.hostname = v;
    await this.saveConfig();
  }

  private async setLdapPort(port: string) {
    const n = this.parseNullableInt(port, "ldap.port");
    if (n != null && (n < 1 || n > 65535)) {
      throw new Error('ldap.port must be between 1 and 65535 (or "null" to clear).');
    }
    await this.loadConfig();
    this.ldap.port = n;
    await this.saveConfig();
  }

  private async setLdapRootPath(rootPath: string) {
    const v = this.parseNullableString(rootPath);
    if (v != null && v.length === 0) {
      throw new Error('ldap.rootPath cannot be empty (use "null" to clear).');
    }
    await this.loadConfig();
    this.ldap.rootPath = v;
    await this.saveConfig();
  }

  private async setLdapDomain(domain: string) {
    const v = this.parseNullableString(domain);
    await this.loadConfig();
    this.ldap.domain = v;
    await this.saveConfig();
  }

  private async setLdapCurrentUser(currentUser: string) {
    const b = this.parseBoolean(currentUser, "ldap.currentUser");
    await this.loadConfig();
    this.ldap.currentUser = b;
    await this.saveConfig();
  }

  private async setLdapUsername(username: string) {
    const v = this.parseNullableString(username);
    await this.loadConfig();
    this.ldap.username = v;
    await this.saveConfig();
  }

  private async setLdapPassword(password: string) {
    await this.loadConfig();
    this.ldap.password = this.parseNullableString(password);
    await this.saveConfig();
  }

  // -----------------------------
  // LDAP TLS / paging / AD
  // -----------------------------

  private async setLdapSsl(value: string) {
    const b = this.parseBoolean(value, "ldap.ssl");
    await this.loadConfig();
    this.ldap.ssl = b;
    await this.saveConfig();
  }

  private async setLdapStartTls(value: string) {
    const b = this.parseBoolean(value, "ldap.startTls");
    await this.loadConfig();
    this.ldap.startTls = b;
    await this.saveConfig();
  }

  private async setLdapTlsCaPath(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.ldap.tlsCaPath = v;
    await this.saveConfig();
  }

  private async setLdapSslCaPath(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.ldap.sslCaPath = v;
    await this.saveConfig();
  }

  private async setLdapSslCertPath(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.ldap.sslCertPath = v;
    await this.saveConfig();
  }

  private async setLdapSslKeyPath(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.ldap.sslKeyPath = v;
    await this.saveConfig();
  }

  private async setLdapSslAllowUnauthorized(value: string) {
    const b = this.parseBoolean(value, "ldap.sslAllowUnauthorized");
    await this.loadConfig();
    this.ldap.sslAllowUnauthorized = b;
    await this.saveConfig();
  }

  private async setLdapPagedSearch(value: string) {
    const b = this.parseBoolean(value, "ldap.pagedSearch");
    await this.loadConfig();
    this.ldap.pagedSearch = b;
    await this.saveConfig();
  }

  private async setLdapAd(value: string) {
    const b = this.parseBoolean(value, "ldap.ad");
    await this.loadConfig();
    this.ldap.ad = b;
    await this.saveConfig();
  }

  // -----------------------------
  // LDAP Kerberos / ldapsearch additions
  // -----------------------------

  private async setLdapAuth(auth: string) {
    const v = (auth || "").trim().toLowerCase();
    if (v !== "simple" && v !== "kerberos") {
      throw new Error("Invalid ldap.auth value. Allowed values: simple, kerberos.");
    }
    await this.loadConfig();
    (this.ldap as any).auth = v;
    await this.saveConfig();
  }

  private async setLdapKerberosPrincipal(principal: string) {
    const v = this.parseNullableString(principal);
    await this.loadConfig();
    (this.ldap as any).kerberosPrincipal = v;
    await this.saveConfig();
  }

  private async setLdapKerberosKeytab(keytabPath: string) {
    const v = this.parseNullableString(keytabPath);
    await this.loadConfig();
    (this.ldap as any).kerberosKeytabPath = v;
    await this.saveConfig();
  }

  private async setLdapKerberosCcache(ccache: string) {
    const v = this.parseNullableString(ccache);
    await this.loadConfig();
    (this.ldap as any).kerberosCcache = v;
    await this.saveConfig();
  }

  private async setLdapKerberosMechanism(mechanism: string) {
    const m = (mechanism || "").trim().toLowerCase();
    let normalized: string;
    if (m === "gssapi") {
      normalized = "GSSAPI";
    } else if (m === "gss-spnego" || m === "gss_spnego" || m === "gssspnego") {
      normalized = "GSS-SPNEGO";
    } else {
      throw new Error("Invalid ldap.kerberos.mechanism value. Allowed values: GSSAPI, GSS-SPNEGO.");
    }
    await this.loadConfig();
    (this.ldap as any).kerberosMechanism = normalized;
    await this.saveConfig();
  }

  private async setLdapLdapsearchPath(ldapsearchPath: string) {
    const v = this.parseNullableString(ldapsearchPath);
    await this.loadConfig();
    (this.ldap as any).ldapsearchPath = v;
    await this.saveConfig();
  }

  // -----------------------------
  // Sync settings
  // -----------------------------

  private async setSyncUsers(value: string) {
    const b = this.parseBoolean(value, "sync.users");
    await this.loadConfig();
    this.sync.users = b;
    await this.saveConfig();
  }

  private async setSyncGroups(value: string) {
    const b = this.parseBoolean(value, "sync.groups");
    await this.loadConfig();
    this.sync.groups = b;
    await this.saveConfig();
  }

  private async setSyncInterval(value: string) {
    const n = this.parseNullableInt(value, "sync.interval");
    if (n != null && n < 0) {
      throw new Error('sync.interval must be >= 0 (or "null" to clear).');
    }
    await this.loadConfig();
    this.sync.interval = n;
    await this.saveConfig();
  }

  private async setSyncUserFilter(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.userFilter = v;
    await this.saveConfig();
  }

  private async setSyncGroupFilter(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.groupFilter = v;
    await this.saveConfig();
  }

  private async setSyncRemoveDisabled(value: string) {
    const b = this.parseBoolean(value, "sync.removeDisabled");
    await this.loadConfig();
    this.sync.removeDisabled = b;
    await this.saveConfig();
  }

  private async setSyncOverwriteExisting(value: string) {
    const b = this.parseBoolean(value, "sync.overwriteExisting");
    await this.loadConfig();
    this.sync.overwriteExisting = b;
    await this.saveConfig();
  }

  private async setSyncLargeImport(value: string) {
    const b = this.parseBoolean(value, "sync.largeImport");
    await this.loadConfig();
    this.sync.largeImport = b;
    await this.saveConfig();
  }

  private async setSyncUserObjectClass(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.userObjectClass = v;
    await this.saveConfig();
  }

  private async setSyncGroupObjectClass(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.groupObjectClass = v;
    await this.saveConfig();
  }

  private async setSyncUserPath(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.userPath = v;
    await this.saveConfig();
  }

  private async setSyncGroupPath(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.groupPath = v;
    await this.saveConfig();
  }

  private async setSyncGroupNameAttribute(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.groupNameAttribute = v;
    await this.saveConfig();
  }

  private async setSyncUserEmailAttribute(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.userEmailAttribute = v;
    await this.saveConfig();
  }

  private async setSyncMemberAttribute(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.memberAttribute = v;
    await this.saveConfig();
  }

  private async setSyncUseEmailPrefixSuffix(value: string) {
    const b = this.parseBoolean(value, "sync.useEmailPrefixSuffix");
    await this.loadConfig();
    this.sync.useEmailPrefixSuffix = b;
    await this.saveConfig();
  }

  private async setSyncEmailPrefixAttribute(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.emailPrefixAttribute = v;
    await this.saveConfig();
  }

  private async setSyncEmailSuffix(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.emailSuffix = v;
    await this.saveConfig();
  }

  private async setSyncCreationDateAttribute(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.creationDateAttribute = v;
    await this.saveConfig();
  }

  private async setSyncRevisionDateAttribute(value: string) {
    const v = this.parseNullableString(value);
    await this.loadConfig();
    this.sync.revisionDateAttribute = v;
    await this.saveConfig();
  }

  // -----------------------------
  // Other directory configs
  // -----------------------------

  private async setGSuiteKey(key: string) {
    await this.loadConfig();
    this.gsuite.privateKey = key != null ? key.trimLeft() : null;
    await this.saveConfig();
  }

  private async setEntraIdKey(key: string) {
    await this.loadConfig();
    this.entra.key = key;
    await this.saveConfig();
  }

  private async setOktaToken(token: string) {
    await this.loadConfig();
    this.okta.token = token;
    await this.saveConfig();
  }

  private async setOneLoginSecret(secret: string) {
    await this.loadConfig();
    this.oneLogin.clientSecret = secret;
    await this.saveConfig();
  }

  private async loadConfig() {
    this.directory = await this.stateService.getDirectoryType();
    this.ldap =
      (await this.stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap)) || this.ldap;
    this.gsuite =
      (await this.stateService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite)) ||
      this.gsuite;
    this.entra =
      (await this.stateService.getDirectory<EntraIdConfiguration>(DirectoryType.EntraID)) ||
      this.entra;
    this.okta =
      (await this.stateService.getDirectory<OktaConfiguration>(DirectoryType.Okta)) || this.okta;
    this.oneLogin =
      (await this.stateService.getDirectory<OneLoginConfiguration>(DirectoryType.OneLogin)) ||
      this.oneLogin;
    this.sync = (await this.stateService.getSync()) || this.sync;
  }

  private async saveConfig() {
    ConnectorUtils.adjustConfigForSave(this.ldap, this.sync);
    await this.stateService.setDirectoryType(this.directory);
    await this.stateService.setDirectory(DirectoryType.Ldap, this.ldap);
    await this.stateService.setDirectory(DirectoryType.GSuite, this.gsuite);
    await this.stateService.setDirectory(DirectoryType.EntraID, this.entra);
    await this.stateService.setDirectory(DirectoryType.Okta, this.okta);
    await this.stateService.setDirectory(DirectoryType.OneLogin, this.oneLogin);
    await this.stateService.setSync(this.sync);
  }
}
