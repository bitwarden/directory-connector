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
    setting = setting.toLowerCase();
    if (value == null || value === "") {
      if (options.secretfile) {
        value = await NodeUtils.readFirstLine(options.secretfile);
      } else if (options.secretenv && process.env[options.secretenv]) {
        value = process.env[options.secretenv];
      }
    }
    try {
      switch (setting) {
        case "server":
          await this.setServer(value);
          break;
        case "directory":
          await this.setDirectory(value);
          break;
        case "ldap.hostname":
          await this.setLdapHostname(value);
          break;
        case "ldap.port":
          await this.setLdapPort(value);
          break;
        case "ldap.rootpath":
          await this.setLdapRootPath(value);
          break;
        case "ldap.password":
          await this.setLdapPassword(value);
          break;
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

  private async setLdapHostname(hostname: string) {
    hostname = hostname === "null" ? null : hostname;
    if (hostname != null) {
      hostname = hostname.trim();
      if (hostname.length === 0) {
        throw new Error('ldap.hostname cannot be empty (use "null" to clear).');
      }
    }
    await this.loadConfig();
    this.ldap.hostname = hostname;
    await this.saveConfig();
  }

  private async setLdapPort(port: string) {
    port = port === "null" ? null : port;
    let parsed: number = null;
    if (port != null) {
      const p = parseInt(port, 10);
      if (!Number.isFinite(p) || p < 1 || p > 65535) {
        throw new Error('ldap.port must be an integer between 1 and 65535 (or "null" to clear).');
      }
      parsed = p;
    }
    await this.loadConfig();
    this.ldap.port = parsed;
    await this.saveConfig();
  }

  private async setLdapRootPath(rootPath: string) {
    rootPath = rootPath === "null" ? null : rootPath;
    if (rootPath != null) {
      rootPath = rootPath.trim();
      if (rootPath.length === 0) {
        throw new Error('ldap.rootPath cannot be empty (use "null" to clear).');
      }
    }
    await this.loadConfig();
    this.ldap.rootPath = rootPath;
    await this.saveConfig();
  }

  private async setLdapPassword(password: string) {
    await this.loadConfig();
    this.ldap.password = password;
    await this.saveConfig();
  }

  private async setLdapAuth(auth: string) {
    auth = auth?.trim()?.toLowerCase();
    if (auth !== "simple" && auth !== "kerberos") {
      throw new Error("Invalid ldap.auth value. Allowed values: simple, kerberos.");
    }
    await this.loadConfig();
    (this.ldap as any).auth = auth;
    await this.saveConfig();
  }

  private async setLdapKerberosPrincipal(principal: string) {
    principal = principal === "null" ? null : principal;
    await this.loadConfig();
    (this.ldap as any).kerberosPrincipal = principal;
    await this.saveConfig();
  }

  private async setLdapKerberosKeytab(keytabPath: string) {
    keytabPath = keytabPath === "null" ? null : keytabPath;
    await this.loadConfig();
    (this.ldap as any).kerberosKeytabPath = keytabPath;
    await this.saveConfig();
  }

  private async setLdapKerberosCcache(ccache: string) {
    ccache = ccache === "null" ? null : ccache;
    await this.loadConfig();
    (this.ldap as any).kerberosCcache = ccache;
    await this.saveConfig();
  }

  private async setLdapKerberosMechanism(mechanism: string) {
    mechanism = mechanism?.trim();
    const mechLower = mechanism?.toLowerCase();
    let normalized: string;
    if (mechLower === "gssapi") {
      normalized = "GSSAPI";
    } else if (mechLower === "gss-spnego" || mechLower === "gss_spnego" || mechLower === "gssspnego") {
      normalized = "GSS-SPNEGO";
    } else {
      throw new Error("Invalid ldap.kerberos.mechanism value. Allowed values: GSSAPI, GSS-SPNEGO.");
    }
    await this.loadConfig();
    (this.ldap as any).kerberosMechanism = normalized;
    await this.saveConfig();
  }

  private async setLdapLdapsearchPath(ldapsearchPath: string) {
    ldapsearchPath = ldapsearchPath === "null" ? null : ldapsearchPath;
    await this.loadConfig();
    (this.ldap as any).ldapsearchPath = ldapsearchPath;
    await this.saveConfig();
  }

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
