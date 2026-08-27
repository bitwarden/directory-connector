import { mock, MockProxy } from "jest-mock-extended";

// Every search the service issues must go through our stub rather than a
// real socket, so we can assert on the options passed to it.
const searchMock = jest.fn();
const bindMock = jest.fn();
const unbindMock = jest.fn();

jest.mock("ldapts", () => ({
  Client: jest.fn().mockImplementation(() => ({
    bind: bindMock,
    unbind: unbindMock,
    search: searchMock,
  })),
  Control: jest.fn().mockImplementation((type: string, options: unknown) => ({ type, options })),
}));

import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { StateService } from "@/libs/abstractions/state.service";
import { DirectoryType } from "@/libs/enums/directoryType";

import {
  getLdapConfiguration,
  getSyncConfiguration,
} from "../../../utils/openldap/config-fixtures";

import { LdapDirectoryService, LdapSearchTimeLimitSeconds } from "./ldap-directory.service";

describe("LdapDirectoryService search time limit", () => {
  let logService: MockProxy<LogService>;
  let i18nService: MockProxy<I18nService>;
  let stateService: MockProxy<StateService>;
  let directoryService: LdapDirectoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    searchMock.mockResolvedValue({ searchEntries: [], searchReferences: [] });
    bindMock.mockResolvedValue(undefined);
    unbindMock.mockResolvedValue(undefined);

    logService = mock();
    i18nService = mock();
    stateService = mock();
    i18nService.t.mockImplementation((id) => id);
    stateService.getDirectoryType.mockResolvedValue(DirectoryType.Ldap);
    stateService.getLastUserSync.mockResolvedValue(null);
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration());

    directoryService = new LdapDirectoryService(logService, i18nService, stateService);
  });

  // Extracts the SearchOptions argument from every recorded client.search(path, options, controls) call.
  const searchOptionsUsed = () => searchMock.mock.calls.map((call) => call[1]);

  it("sets a generous server-side time limit instead of ldapts's 10-second default", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true }));

    await directoryService.getEntries(true, true);

    expect(searchMock).toHaveBeenCalled();
    for (const options of searchOptionsUsed()) {
      expect(options.timeLimit).toBe(LdapSearchTimeLimitSeconds);
    }
  });

  it("applies the same time limit to every search, including the repeated user-filter lookup during group sync", async () => {
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));

    await directoryService.getEntries(true, true);

    // getUsers() searches once for regular users, and getGroups() re-runs the user
    // filter again (to map member DNs) plus its own group search - at least 3 calls.
    const optionsUsed = searchOptionsUsed();
    expect(optionsUsed.length).toBeGreaterThanOrEqual(3);
    for (const options of optionsUsed) {
      expect(options.timeLimit).toBe(LdapSearchTimeLimitSeconds);
    }
  });

  it("still applies the time limit to the deleted-users lookup for Active Directory test syncs", async () => {
    stateService.getDirectory
      .calledWith(DirectoryType.Ldap)
      .mockResolvedValue(getLdapConfiguration({ ad: true }));
    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true }));

    await directoryService.getEntries(true, true);

    // Regular users + the "Deleted Objects" search AD-specific search.
    const optionsUsed = searchOptionsUsed();
    expect(optionsUsed.length).toBeGreaterThanOrEqual(2);
    for (const options of optionsUsed) {
      expect(options.timeLimit).toBe(LdapSearchTimeLimitSeconds);
    }
  });
});
