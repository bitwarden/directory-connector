import * as program from 'commander';

import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';

import { ConfigurationService } from '../services/configuration.service';

import { DirectoryType } from '../enums/directoryType';

import { Response } from 'jslib/cli/models/response';
import { MessageResponse } from 'jslib/cli/models/response/messageResponse';

import { AzureConfiguration } from '../models/azureConfiguration';
import { GSuiteConfiguration } from '../models/gsuiteConfiguration';
import { LdapConfiguration } from '../models/ldapConfiguration';
import { OktaConfiguration } from '../models/oktaConfiguration';
import { OneLoginConfiguration } from '../models/oneLoginConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';

import { ConnectorUtils } from '../utils';

export class ConfigCommand {
    private directory: DirectoryType;
    private ldap = new LdapConfiguration();
    private gsuite = new GSuiteConfiguration();
    private azure = new AzureConfiguration();
    private okta = new OktaConfiguration();
    private oneLogin = new OneLoginConfiguration();
    private sync = new SyncConfiguration();

    constructor(private environmentService: EnvironmentService, private i18nService: I18nService,
        private configurationService: ConfigurationService) { }

    async run(setting: string, value: string, cmd: program.Command): Promise<Response> {
        setting = setting.toLowerCase();
        try {
            switch (setting) {
                case 'server':
                    await this.setServer(value);
                    break;
                case 'directory':
                    await this.setDirectory(value);
                    break;
                case 'ldap.password':
                    await this.setLdapPassword(value);
                    break;
                case 'gsuite.key':
                    await this.setGSuiteKey(value);
                    break;
                case 'azure.key':
                    await this.setAzureKey(value);
                    break;
                case 'okta.token':
                    await this.setOktaToken(value);
                    break;
                case 'onelogin.secret':
                    await this.setOneLoginSecret(value);
                    break;
                default:
                    return Response.badRequest('Unknown setting.');
            }
        } catch (e) {
            return Response.error(e);
        }
        const res = new MessageResponse(this.i18nService.t('savedSetting', setting), null);
        return Response.success(res);
    }

    private async setServer(url: string) {
        url = (url === 'null' || url === 'bitwarden.com' || url === 'https://bitwarden.com' ? null : url);
        await this.environmentService.setUrls({
            base: url,
        });
    }

    private async setDirectory(type: string) {
        const dir = parseInt(type, null);
        if (dir < DirectoryType.Ldap || dir > DirectoryType.OneLogin) {
            throw new Error('Invalid directory type value.');
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
        this.directory = await this.configurationService.getDirectoryType();
        this.ldap = (await this.configurationService.getDirectory<LdapConfiguration>(DirectoryType.Ldap)) ||
            this.ldap;
        this.gsuite = (await this.configurationService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite)) ||
            this.gsuite;
        this.azure = (await this.configurationService.getDirectory<AzureConfiguration>(
            DirectoryType.AzureActiveDirectory)) || this.azure;
        this.okta = (await this.configurationService.getDirectory<OktaConfiguration>(
            DirectoryType.Okta)) || this.okta;
        this.oneLogin = (await this.configurationService.getDirectory<OneLoginConfiguration>(
            DirectoryType.OneLogin)) || this.oneLogin;
        this.sync = (await this.configurationService.getSync()) || this.sync;
    }

    private async saveConfig() {
        ConnectorUtils.adjustConfigForSave(this.ldap, this.sync);
        await this.configurationService.saveDirectoryType(this.directory);
        await this.configurationService.saveDirectory(DirectoryType.Ldap, this.ldap);
        await this.configurationService.saveDirectory(DirectoryType.GSuite, this.gsuite);
        await this.configurationService.saveDirectory(DirectoryType.AzureActiveDirectory, this.azure);
        await this.configurationService.saveDirectory(DirectoryType.Okta, this.okta);
        await this.configurationService.saveDirectory(DirectoryType.OneLogin, this.oneLogin);
        await this.configurationService.saveSync(this.sync);
    }
}
