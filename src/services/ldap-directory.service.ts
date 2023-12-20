import * as fs from "fs";
import { checkServerIdentity, PeerCertificate } from "tls";

import * as ldap from "ldapjs";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { Utils } from "@/jslib/common/src/misc/utils";

import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";
import { GroupEntry } from "../models/groupEntry";
import { LdapConfiguration } from "../models/ldapConfiguration";
import { SyncConfiguration } from "../models/syncConfiguration";
import { UserEntry } from "../models/userEntry";

import { IDirectoryService } from "./directory.service";

const UserControlAccountDisabled = 2;

export class LdapDirectoryService implements IDirectoryService {
  private client: ldap.Client;
  private dirConfig: LdapConfiguration;
  private syncConfig: SyncConfiguration;

  constructor(
    private logService: LogService,
    private i18nService: I18nService,
    private stateService: StateService
  ) {}

  async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
    const type = await this.stateService.getDirectoryType();
    if (type !== DirectoryType.Ldap) {
      return;
    }

    this.dirConfig = await this.stateService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);
    if (this.dirConfig == null) {
      return;
    }

    this.syncConfig = await this.stateService.getSync();
    if (this.syncConfig == null) {
      return;
    }

    await this.bind();

    let users: UserEntry[];
    if (this.syncConfig.users) {
      users = await this.getUsers(force);
    }

    let groups: GroupEntry[];
    if (this.syncConfig.groups) {
      let groupForce = force;
      if (!groupForce && users != null) {
        const activeUsers = users.filter((u) => !u.deleted && !u.disabled);
        groupForce = activeUsers.length > 0;
      }
      groups = await this.getGroups(groupForce);
    }

    await this.unbind();
    return [groups, users];
  }

  private async getUsers(force: boolean): Promise<UserEntry[]> {
    const lastSync = await this.stateService.getLastUserSync();
    let filter = this.buildBaseFilter(this.syncConfig.userObjectClass, this.syncConfig.userFilter);
    filter = this.buildRevisionFilter(filter, force, lastSync);

    const path = this.makeSearchPath(this.syncConfig.userPath);
    this.logService.info("User search: " + path + " => " + filter);

    const regularUsers = await this.search<UserEntry>(path, filter, (se: any) =>
      this.buildUser(se, false)
    );
    if (!this.dirConfig.ad) {
      return regularUsers;
    }

    try {
      let deletedFilter = this.buildBaseFilter(this.syncConfig.userObjectClass, "(isDeleted=TRUE)");
      deletedFilter = this.buildRevisionFilter(deletedFilter, force, lastSync);

      const deletedPath = this.makeSearchPath("CN=Deleted Objects");
      this.logService.info("Deleted user search: " + deletedPath + " => " + deletedFilter);

      const delControl = new (ldap as any).Control({
        type: "1.2.840.113556.1.4.417",
        criticality: true,
      });
      const deletedUsers = await this.search<UserEntry>(
        deletedPath,
        deletedFilter,
        (se: any) => this.buildUser(se, true),
        [delControl]
      );
      return regularUsers.concat(deletedUsers);
    } catch (e) {
      this.logService.warning("Cannot query deleted users.");
      return regularUsers;
    }
  }

  private buildUser(searchEntry: any, deleted: boolean): UserEntry {
    const user = new UserEntry();
    user.referenceId = searchEntry.objectName;
    user.deleted = deleted;

    if (user.referenceId == null) {
      return null;
    }

    user.externalId = this.getExternalId(searchEntry, user.referenceId);
    user.disabled = this.entryDisabled(searchEntry);
    user.email = this.getAttr(searchEntry, this.syncConfig.userEmailAttribute);
    if (
      user.email == null &&
      this.syncConfig.useEmailPrefixSuffix &&
      this.syncConfig.emailPrefixAttribute != null &&
      this.syncConfig.emailSuffix != null
    ) {
      const prefixAttr = this.getAttr(searchEntry, this.syncConfig.emailPrefixAttribute);
      if (prefixAttr != null) {
        user.email = prefixAttr + this.syncConfig.emailSuffix;
      }
    }

    if (user.email != null) {
      user.email = user.email.trim().toLowerCase();
    }

    if (!user.deleted && (user.email == null || user.email.trim() === "")) {
      return null;
    }

    return user;
  }

  private async getGroups(force: boolean): Promise<GroupEntry[]> {
    const entries: GroupEntry[] = [];

    const lastSync = await this.stateService.getLastUserSync();
    const originalFilter = this.buildBaseFilter(
      this.syncConfig.groupObjectClass,
      this.syncConfig.groupFilter
    );
    let filter = originalFilter;
    const revisionFilter = this.buildRevisionFilter(filter, force, lastSync);
    const searchSinceRevision = filter !== revisionFilter;
    filter = revisionFilter;

    const path = this.makeSearchPath(this.syncConfig.groupPath);
    this.logService.info("Group search: " + path + " => " + filter);

    let groupSearchEntries: any[] = [];
    const initialSearchGroupIds = await this.search<string>(path, filter, (se: any) => {
      groupSearchEntries.push(se);
      return se.objectName;
    });

    if (searchSinceRevision && initialSearchGroupIds.length === 0) {
      return [];
    } else if (searchSinceRevision) {
      groupSearchEntries = await this.search<string>(path, originalFilter, (se: any) => se);
    }

    const userFilter = this.buildBaseFilter(
      this.syncConfig.userObjectClass,
      this.syncConfig.userFilter
    );
    const userPath = this.makeSearchPath(this.syncConfig.userPath);
    const userIdMap = new Map<string, string>();
    await this.search<string>(userPath, userFilter, (se: any) => {
      userIdMap.set(se.objectName, this.getExternalId(se, se.objectName));
      return se;
    });

    for (const se of groupSearchEntries) {
      const group = this.buildGroup(se, userIdMap);
      if (group != null) {
        entries.push(group);
      }
    }

    return entries;
  }

  private buildGroup(searchEntry: any, userMap: Map<string, string>) {
    const group = new GroupEntry();
    group.referenceId = searchEntry.objectName;
    if (group.referenceId == null) {
      return null;
    }

    group.externalId = this.getExternalId(searchEntry, group.referenceId);

    group.name = this.getAttr(searchEntry, this.syncConfig.groupNameAttribute);
    if (group.name == null) {
      group.name = this.getAttr(searchEntry, "cn");
    }

    if (group.name == null) {
      return null;
    }

    const members = this.getAttrVals(searchEntry, this.syncConfig.memberAttribute);
    if (members != null) {
      for (const memDn of members) {
        if (userMap.has(memDn) && !group.userMemberExternalIds.has(userMap.get(memDn))) {
          group.userMemberExternalIds.add(userMap.get(memDn));
        } else if (!group.groupMemberReferenceIds.has(memDn)) {
          group.groupMemberReferenceIds.add(memDn);
        }
      }
    }

    return group;
  }

  private getExternalId(searchEntry: any, referenceId: string) {
    const attrObj = this.getAttrObj(searchEntry, "objectGUID");
    if (attrObj != null && attrObj._vals != null && attrObj._vals.length > 0) {
      return this.bufToGuid(attrObj._vals[0]);
    } else {
      return referenceId;
    }
  }

  private buildBaseFilter(objectClass: string, subFilter: string): string {
    let filter = this.buildObjectClassFilter(objectClass);
    if (subFilter != null && subFilter.trim() !== "") {
      filter = "(&" + filter + subFilter + ")";
    }
    return filter;
  }

  private buildObjectClassFilter(objectClass: string): string {
    return "(&(objectClass=" + objectClass + "))";
  }

  private buildRevisionFilter(baseFilter: string, force: boolean, lastRevisionDate: Date) {
    const revisionAttr = this.syncConfig.revisionDateAttribute;
    if (!force && lastRevisionDate != null && revisionAttr != null && revisionAttr.trim() !== "") {
      const dateString = lastRevisionDate.toISOString().replace(/[-:T]/g, "").substr(0, 16) + "Z";
      baseFilter = "(&" + baseFilter + "(" + revisionAttr + ">=" + dateString + "))";
    }

    return baseFilter;
  }

  private makeSearchPath(pathPrefix: string) {
    if (this.dirConfig.rootPath.toLowerCase().indexOf("dc=") === -1) {
      return pathPrefix;
    }
    if (this.dirConfig.rootPath != null && this.dirConfig.rootPath.trim() !== "") {
      const trimmedRootPath = this.dirConfig.rootPath.trim().toLowerCase();
      let path = trimmedRootPath.substr(trimmedRootPath.indexOf("dc="));
      if (pathPrefix != null && pathPrefix.trim() !== "") {
        path = pathPrefix.trim() + "," + path;
      }
      return path;
    }

    return null;
  }

  private getAttrObj(searchEntry: any, attr: string): any {
    if (searchEntry == null || searchEntry.attributes == null) {
      return null;
    }

    const attrs = searchEntry.attributes.filter((a: any) => a.type === attr);
    if (
      attrs == null ||
      attrs.length === 0 ||
      attrs[0].vals == null ||
      attrs[0].vals.length === 0
    ) {
      return null;
    }

    return attrs[0];
  }

  private getAttrVals(searchEntry: any, attr: string): string[] {
    const obj = this.getAttrObj(searchEntry, attr);
    if (obj == null) {
      return null;
    }
    return obj.vals;
  }

  private getAttr(searchEntry: any, attr: string): string {
    const vals = this.getAttrVals(searchEntry, attr);
    if (vals == null) {
      return null;
    }
    return vals[0];
  }

  private entryDisabled(searchEntry: any): boolean {
    const c = this.getAttr(searchEntry, "userAccountControl");
    if (c != null) {
      try {
        const control = parseInt(c, null);
        // tslint:disable-next-line
        return (control & UserControlAccountDisabled) === UserControlAccountDisabled;
      } catch (e) {
        this.logService.error(e);
      }
    }

    return false;
  }

  private async search<T>(
    path: string,
    filter: string,
    processEntry: (searchEntry: any) => T,
    controls: ldap.Control[] = []
  ): Promise<T[]> {
    const options: ldap.SearchOptions = {
      filter: filter,
      scope: "sub",
      paged: this.dirConfig.pagedSearch,
    };
    const entries: T[] = [];
    return new Promise<T[]>((resolve, reject) => {
      this.client.search(path, options, controls, (err, res) => {
        if (err != null) {
          reject(err);
          return;
        }

        res.on("error", (resErr) => {
          reject(resErr);
        });

        res.on("searchEntry", (entry) => {
          const e = processEntry(entry);
          if (e != null) {
            entries.push(e);
          }
        });

        res.on("end", (result) => {
          resolve(entries);
        });
      });
    });
  }

  private async bind(): Promise<any> {
    return new Promise<void>((resolve, reject) => {
      if (this.dirConfig.hostname == null || this.dirConfig.port == null) {
        reject(this.i18nService.t("dirConfigIncomplete"));
        return;
      }
      const protocol = "ldap" + (this.dirConfig.ssl && !this.dirConfig.startTls ? "s" : "");
      const url = protocol + "://" + this.dirConfig.hostname + ":" + this.dirConfig.port;
      const options: ldap.ClientOptions = {
        url: url.trim().toLowerCase(),
      };

      const tlsOptions: any = {};
      if (this.dirConfig.ssl) {
        if (this.dirConfig.sslAllowUnauthorized) {
          tlsOptions.rejectUnauthorized = !this.dirConfig.sslAllowUnauthorized;
        }
        if (!this.dirConfig.startTls) {
          if (
            this.dirConfig.sslCaPath != null &&
            this.dirConfig.sslCaPath !== "" &&
            fs.existsSync(this.dirConfig.sslCaPath)
          ) {
            tlsOptions.ca = [fs.readFileSync(this.dirConfig.sslCaPath)];
          }
          if (
            this.dirConfig.sslCertPath != null &&
            this.dirConfig.sslCertPath !== "" &&
            fs.existsSync(this.dirConfig.sslCertPath)
          ) {
            tlsOptions.cert = fs.readFileSync(this.dirConfig.sslCertPath);
          }
          if (
            this.dirConfig.sslKeyPath != null &&
            this.dirConfig.sslKeyPath !== "" &&
            fs.existsSync(this.dirConfig.sslKeyPath)
          ) {
            tlsOptions.key = fs.readFileSync(this.dirConfig.sslKeyPath);
          }
        } else {
          if (
            this.dirConfig.tlsCaPath != null &&
            this.dirConfig.tlsCaPath !== "" &&
            fs.existsSync(this.dirConfig.tlsCaPath)
          ) {
            tlsOptions.ca = [fs.readFileSync(this.dirConfig.tlsCaPath)];
          }
        }
      }

      tlsOptions.checkServerIdentity = this.checkServerIdentityAltNames;
      options.tlsOptions = tlsOptions;

      this.client = ldap.createClient(options);

      const user =
        this.dirConfig.username == null || this.dirConfig.username.trim() === ""
          ? null
          : this.dirConfig.username;
      const pass =
        this.dirConfig.password == null || this.dirConfig.password.trim() === ""
          ? null
          : this.dirConfig.password;

      if (user == null || pass == null) {
        reject(this.i18nService.t("usernamePasswordNotConfigured"));
        return;
      }

      if (this.dirConfig.startTls && this.dirConfig.ssl) {
        this.client.starttls(options.tlsOptions, undefined, (err, res) => {
          if (err != null) {
            reject(err.message);
          } else {
            this.client.bind(user, pass, (err2) => {
              if (err2 != null) {
                reject(err2.message);
              } else {
                resolve();
              }
            });
          }
        });
      } else {
        this.client.bind(user, pass, (err) => {
          if (err != null) {
            reject(err.message);
          } else {
            resolve();
          }
        });
      }
    });
  }

  private async unbind(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.unbind((err) => {
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private bufToGuid(buf: Buffer) {
    const arr = new Uint8Array(buf);
    const p1 = arr.slice(0, 4).reverse().buffer;
    const p2 = arr.slice(4, 6).reverse().buffer;
    const p3 = arr.slice(6, 8).reverse().buffer;
    const p4 = arr.slice(8, 10).buffer;
    const p5 = arr.slice(10).buffer;
    const guid =
      Utils.fromBufferToHex(p1) +
      "-" +
      Utils.fromBufferToHex(p2) +
      "-" +
      Utils.fromBufferToHex(p3) +
      "-" +
      Utils.fromBufferToHex(p4) +
      "-" +
      Utils.fromBufferToHex(p5);
    return guid.toLowerCase();
  }

  private checkServerIdentityAltNames(host: string, cert: PeerCertificate) {
    // Fixes the cert representation when subject is empty and altNames are present
    // Required for node versions < 12.14.1 (which could be used for bwdc cli)
    // Adapted from: https://github.com/auth0/ad-ldap-connector/commit/1f4dd2be6ed93dda591dd31ed5483a9b452a8d2a
    // See https://github.com/nodejs/node/issues/11771 for details
    if (cert && cert.subject == null && /(IP|DNS|URL)/.test(cert.subjectaltname)) {
      cert.subject = {
        C: null,
        ST: null,
        L: null,
        O: null,
        OU: null,
        CN: null,
      };
    }

    return checkServerIdentity(host, cert);
  }
}
