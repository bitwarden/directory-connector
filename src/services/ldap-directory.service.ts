import * as fs from "fs";
import * as tls from "tls";

import * as ldapts from "ldapts";

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

/**
 * The attribute name for the unique identifier used by Active Directory.
 */
const ActiveDirectoryExternalId = "objectGUID";

export class LdapDirectoryService implements IDirectoryService {
  private client: ldapts.Client;
  private dirConfig: LdapConfiguration;
  private syncConfig: SyncConfiguration;

  constructor(
    private logService: LogService,
    private i18nService: I18nService,
    private stateService: StateService,
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
    let groups: GroupEntry[];

    try {
      if (this.syncConfig.users) {
        users = await this.getUsers(force, test);
      }

      if (this.syncConfig.groups) {
        let groupForce = force;
        if (!groupForce && users != null) {
          const activeUsers = users.filter((u) => !u.deleted && !u.disabled);
          groupForce = activeUsers.length > 0;
        }
        groups = await this.getGroups(groupForce);
      }
    } finally {
      await this.client.unbind();
    }

    return [groups, users];
  }

  private async getUsers(force: boolean, test: boolean): Promise<UserEntry[]> {
    const lastSync = await this.stateService.getLastUserSync();
    let filter = this.buildBaseFilter(this.syncConfig.userObjectClass, this.syncConfig.userFilter);
    filter = this.buildRevisionFilter(filter, force, lastSync);

    const path = this.makeSearchPath(this.syncConfig.userPath);
    this.logService.info("User search: " + path + " => " + filter);

    const regularUsers = await this.search<UserEntry>(path, filter, (se: any) =>
      this.buildUser(se, false),
    );

    // Active Directory has a special way of managing deleted users that
    // standard LDAP does not. Users can be "tombstoned", where they cease to
    // exist, or they can be "recycled" where they exist in a quarantined
    // state for a period of time before being tombstoned.
    //
    // Essentially, recycled users are soft deleted but tombstoned users are
    // hard deleted. In standard LDAP deleted users are only ever hard
    // deleted.
    //
    // We check for recycled Active Directory users below, but only if the
    // sync is a test sync or the "Overwrite existing users" flag is checked.
    const ignoreDeletedUsers = !this.dirConfig.ad || (!force && !test);
    if (ignoreDeletedUsers) {
      return regularUsers;
    }

    try {
      let deletedFilter = this.buildBaseFilter(this.syncConfig.userObjectClass, "(isDeleted=TRUE)");
      deletedFilter = this.buildRevisionFilter(deletedFilter, force, lastSync);

      const deletedPath = this.makeSearchPath("CN=Deleted Objects");
      this.logService.info("Deleted user search: " + deletedPath + " => " + deletedFilter);

      const delControl = new ldapts.Control("1.2.840.113556.1.4.417", { critical: true });
      const deletedUsers = await this.search<UserEntry>(
        deletedPath,
        deletedFilter,
        (se: any) => this.buildUser(se, true),
        [delControl],
      );
      return regularUsers.concat(deletedUsers);
    } catch {
      this.logService.warning("Cannot query deleted users.");
      return regularUsers;
    }
  }

  private buildUser(searchEntry: any, deleted: boolean): UserEntry {
    const user = new UserEntry();
    user.referenceId = this.getReferenceId(searchEntry);
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
      this.syncConfig.groupFilter,
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
      return this.getReferenceId(se);
    });

    if (searchSinceRevision && initialSearchGroupIds.length === 0) {
      return [];
    } else if (searchSinceRevision) {
      groupSearchEntries = await this.search<string>(path, originalFilter, (se: any) => se);
    }

    const userFilter = this.buildBaseFilter(
      this.syncConfig.userObjectClass,
      this.syncConfig.userFilter,
    );
    const userPath = this.makeSearchPath(this.syncConfig.userPath);
    const userDnMap = new Map<string, string>();
    const userUidMap = new Map<string, string>();
    await this.search<string>(userPath, userFilter, (se: any) => {
      const dn = this.getReferenceId(se);
      const uid = this.getAttr<string>(se, "uid");
      const externalId = this.getExternalId(se, dn);
      userDnMap.set(dn, externalId);
      if (uid != null) {
        userUidMap.set(uid.toLowerCase(), externalId);
      }
      return se;
    });

    for (const se of groupSearchEntries) {
      const group = this.buildGroup(se, userDnMap, userUidMap);
      if (group != null) {
        entries.push(group);
      }
    }

    return entries;
  }

  /**
   * Builds a GroupEntry from LDAP search results, including membership.
   * Supports user membership by DN or UID and nested group membership by DN.
   *
   * @param searchEntry - The LDAP search entry containing group data
   * @param userDnMap - Map of user DNs to their external IDs
   * @param userUidMap - Map of user UIDs to their external IDs
   * @returns A populated GroupEntry object, or null if the group lacks required properties
   */
  private buildGroup(
    searchEntry: any,
    userDnMap: Map<string, string>,
    userUidMap: Map<string, string>,
  ) {
    const group = new GroupEntry();
    group.referenceId = this.getReferenceId(searchEntry);
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

    const members = this.getAttrVals<string>(searchEntry, this.syncConfig.memberAttribute);
    if (members != null) {
      // Parses a group member attribute and identifies it as a member DN, member Uid, or a group Dn
      const getMemberAttributeType = (member: string): "memberDn" | "memberUid" | "groupDn" => {
        const isDnLike = member.includes("=") && member.includes(",");
        if (isDnLike) {
          return userDnMap.has(member) ? "memberDn" : "groupDn";
        }
        return "memberUid";
      };

      for (const member of members) {
        switch (getMemberAttributeType(member)) {
          case "memberDn": {
            const externalId = userDnMap.get(member);
            if (externalId != null) {
              group.userMemberExternalIds.add(externalId);
            }
            break;
          }
          case "memberUid": {
            const externalId = userUidMap.get(member.toLowerCase());
            if (externalId != null) {
              group.userMemberExternalIds.add(externalId);
            }
            break;
          }
          case "groupDn":
            group.groupMemberReferenceIds.add(member);
            break;
        }
      }
    }

    return group;
  }

  /**
   * The externalId is the "objectGUID" property if present (a unique identifier used by Active Directory),
   * otherwise it falls back to the provided referenceId.
   */
  private getExternalId(searchEntry: ldapts.Entry, referenceId: string) {
    const attr = this.getAttr<Buffer>(searchEntry, ActiveDirectoryExternalId);
    if (attr != null) {
      return this.bufToGuid(attr);
    } else {
      return referenceId;
    }
  }

  /**
   * Gets the object's reference id (dn)
   */
  private getReferenceId(entry: ldapts.Entry): string {
    return entry.dn;
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

  /**
   */

  /**
   * Get all values for an ldap attribute
   * @param searchEntry The ldap entry
   * @param attr An attribute name on the ldap entry
   * @returns An array containing all values of the attribute, or null if there are no values
   */
  private getAttrVals<T extends string | Buffer>(
    searchEntry: ldapts.Entry,
    attr: string,
  ): T[] | null {
    if (searchEntry == null || searchEntry[attr] == null) {
      return null;
    }

    const vals = searchEntry[attr];
    if (!Array.isArray(vals)) {
      return [vals] as T[];
    }

    return vals as T[];
  }

  /**
   * Get the first value for an ldap attribute
   * @param searchEntry The ldap entry
   * @param attr An attribute name on the ldap entry
   * @returns The first value of the attribute, or null if there is not at least 1 value
   */
  private getAttr<T extends string | Buffer>(searchEntry: ldapts.Entry, attr: string): T {
    const vals = this.getAttrVals(searchEntry, attr);
    if (vals == null || vals.length < 1) {
      return null;
    }

    return vals[0] as T;
  }

  private entryDisabled(searchEntry: any): boolean {
    const c = this.getAttr<string>(searchEntry, "userAccountControl");
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
    processEntry: (searchEntry: ldapts.Entry) => T,
    controls: ldapts.Control[] = [],
  ): Promise<T[]> {
    const options: ldapts.SearchOptions = {
      filter: filter,
      scope: "sub",
      paged: this.dirConfig.pagedSearch,
      // We need to expressly tell ldapts what attributes to return as Buffer objects,
      // otherwise they are returned as strings
      explicitBufferAttributes: [ActiveDirectoryExternalId],
    };
    const { searchEntries } = await this.client.search(path, options, controls);
    return searchEntries.map((e) => processEntry(e)).filter((e) => e != null);
  }

  private async bind(): Promise<any> {
    if (this.dirConfig.hostname == null || this.dirConfig.port == null) {
      throw new Error(this.i18nService.t("dirConfigIncomplete"));
    }

    const protocol = this.dirConfig.ssl && !this.dirConfig.startTls ? "ldaps" : "ldap";

    const url = protocol + "://" + this.dirConfig.hostname + ":" + this.dirConfig.port;
    const options: ldapts.ClientOptions = {
      url: url.trim().toLowerCase(),
    };

    // If using ldaps, TLS options are given to the client constructor
    if (protocol === "ldaps") {
      options.tlsOptions = this.buildTlsOptions();
    }

    this.client = new ldapts.Client(options);

    const user =
      this.dirConfig.username == null || this.dirConfig.username.trim() === ""
        ? null
        : this.dirConfig.username;
    const pass =
      this.dirConfig.password == null || this.dirConfig.password.trim() === ""
        ? null
        : this.dirConfig.password;

    if (user == null || pass == null) {
      throw new Error(this.i18nService.t("usernamePasswordNotConfigured"));
    }

    // If using StartTLS, TLS options are given to the StartTLS call
    if (this.dirConfig.startTls && this.dirConfig.ssl) {
      await this.client.startTLS(this.buildTlsOptions());
    }

    try {
      await this.client.bind(user, pass);
    } catch {
      await this.client.unbind();
    }
  }

  private buildTlsOptions(): tls.ConnectionOptions {
    const tlsOptions: tls.ConnectionOptions = {};

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

    tlsOptions.checkServerIdentity = this.checkServerIdentityAltNames;

    return tlsOptions;
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

  private checkServerIdentityAltNames(host: string, cert: tls.PeerCertificate) {
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

    return tls.checkServerIdentity(host, cert);
  }
}
