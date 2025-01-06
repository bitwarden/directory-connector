import { DirectoryFactoryAbstraction } from "@/jslib/common/src/abstractions/directory-factory.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";

import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";

import { AzureDirectoryService } from "./azure-directory.service";
import { GSuiteDirectoryService } from "./gsuite-directory.service";
import { LdapDirectoryService } from "./ldap-directory.service";
import { OktaDirectoryService } from "./okta-directory.service";
import { OneLoginDirectoryService } from "./onelogin-directory.service";

export class DirectoryFactoryService implements DirectoryFactoryAbstraction {
  createService(
    directoryType: DirectoryType,
    logService: LogService,
    i18nService: I18nService,
    stateService: StateService,
  ) {
    switch (directoryType) {
      case DirectoryType.GSuite:
        return new GSuiteDirectoryService(logService, i18nService, stateService);
      case DirectoryType.AzureActiveDirectory:
        return new AzureDirectoryService(logService, i18nService, stateService);
      case DirectoryType.Ldap:
        return new LdapDirectoryService(logService, i18nService, stateService);
      case DirectoryType.Okta:
        return new OktaDirectoryService(logService, i18nService, stateService);
      case DirectoryType.OneLogin:
        return new OneLoginDirectoryService(logService, i18nService, stateService);
      default:
        return null;
    }
  }
}
