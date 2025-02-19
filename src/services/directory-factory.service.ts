import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";

import { DirectoryFactoryService } from "../abstractions/directory-factory.service";
import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";

import { AzureDirectoryService } from "./azure-directory.service";
import { GSuiteDirectoryService } from "./gsuite-directory.service";
import { LdapDirectoryService } from "./ldap-directory.service";
import { OktaDirectoryService } from "./okta-directory.service";
import { OneLoginDirectoryService } from "./onelogin-directory.service";

export class DefaultDirectoryFactoryService implements DirectoryFactoryService {
  constructor(
    private logService: LogService,
    private i18nService: I18nService,
    private stateService: StateService,
  ) {}

  createService(directoryType: DirectoryType) {
    switch (directoryType) {
      case DirectoryType.GSuite:
        return new GSuiteDirectoryService(this.logService, this.i18nService, this.stateService);
      case DirectoryType.AzureActiveDirectory:
        return new AzureDirectoryService(this.logService, this.i18nService, this.stateService);
      case DirectoryType.Ldap:
        return new LdapDirectoryService(this.logService, this.i18nService, this.stateService);
      case DirectoryType.Okta:
        return new OktaDirectoryService(this.logService, this.i18nService, this.stateService);
      case DirectoryType.OneLogin:
        return new OneLoginDirectoryService(this.logService, this.i18nService, this.stateService);
      default:
        throw new Error("Invalid Directory Type");
    }
  }
}
