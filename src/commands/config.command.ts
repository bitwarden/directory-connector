import * as program from "commander";

import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { NodeUtils } from "@/jslib/common/src/misc/nodeUtils";
import { Response } from "@/jslib/node/src/cli/models/response";
import { MessageResponse } from "@/jslib/node/src/cli/models/response/messageResponse";

import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";
import { AzureConfiguration } from "../models/azureConfiguration";
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
  private azure = new AzureConfiguration();
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
        case "ldap.password":
          await this.setLdapPassword(value);
          break;
        case "gsuite.key":
          await this.setGSuiteKey(value);
          break;
        case "azure.key":
          await this.setAzureKey(value);
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

  private async setLdapPassword(password: string) {
    await this.loadConfig();
    this.ldap.password = password;
    await this.saveConfig();
  }

  private async setGSuiteKey(key: string) {
    await this.loadConfig();
    this.gsuite.privateKey = key != null ? key.trimLeft() : null;
    await this.saveConfig();
  }

  private async setAzureKey(key: string) {
    await this.loadConfig();
    this.azure.key = key;
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
    this.azure =
      (await this.stateService.getDirectory<AzureConfiguration>(
        DirectoryType.AzureActiveDirectory,
      )) || this.azure;
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
    await this.stateService.setDirectory(DirectoryType.AzureActiveDirectory, this.azure);
    await this.stateService.setDirectory(DirectoryType.Okta, this.okta);
    await this.stateService.setDirectory(DirectoryType.OneLogin, this.oneLogin);
    await this.stateService.setSync(this.sync);
  }
}
