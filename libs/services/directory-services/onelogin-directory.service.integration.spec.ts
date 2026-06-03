///**
// * @jest-environment node
// */
//import { config as dotenvConfig } from "dotenv";
//import { mock, MockProxy } from "jest-mock-extended";
//
//import { I18nService } from "@/libs/abstractions/i18n.service";
//import { LogService } from "@/libs/abstractions/log.service";
//import { StateService } from "@/libs/abstractions/state.service";
//
//import {
//  getOneLoginConfiguration,
//  getSyncConfiguration,
//} from "../../../utils/onelogin/config-fixtures";
//import { DirectoryType } from "../../enums/directoryType";
//
//import { OneLoginDirectoryService } from "./onelogin-directory.service";
//
//// These tests integrate with a test OneLogin organization.
//// Credentials are located in the shared Bitwarden collection for Directory Connector testing.
//// Place the .env file attachment in the utils folder.
//
//// Load .env variables
//dotenvConfig({ path: "utils/.env" });
//
//// This filter targets integration test data.
//const INTEGRATION_GROUP_FILTER = "include: Integration Test Role";
//
//// These tests are slow!
//// Increase the default timeout from 5s to 30s
//jest.setTimeout(30000);
//
//describe("oneLoginDirectoryService", () => {
//  let logService: MockProxy<LogService>;
//  let i18nService: MockProxy<I18nService>;
//  let stateService: MockProxy<StateService>;
//
//  let directoryService: OneLoginDirectoryService;
//
//  beforeEach(() => {
//    logService = mock();
//    i18nService = mock();
//    stateService = mock();
//
//    stateService.getDirectoryType.mockResolvedValue(DirectoryType.OneLogin);
//    stateService.getDirectory
//      .calledWith(DirectoryType.OneLogin)
//      .mockResolvedValue(getOneLoginConfiguration());
//    i18nService.t.mockImplementation((id) => id); // passthrough for error messages
//
//    directoryService = new OneLoginDirectoryService(logService, i18nService, stateService);
//  });
//
//  it("syncs without filters (includes integration test data)", async () => {
//    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));
//
//    const [groups, users] = await directoryService.getEntries(true, true);
//
//    expect(groups).toBeDefined();
//    expect(users).toBeDefined();
//  });
//
//  it("syncs users only (no groups)", async () => {
//    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: false }));
//
//    const [groups, users] = await directoryService.getEntries(true, true);
//
//    expect(groups).toBeUndefined();
//    expect(users).toBeDefined();
//  });
//
//  it("syncs groups only (no users)", async () => {
//    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: false, groups: true }));
//
//    const [groups, users] = await directoryService.getEntries(true, true);
//
//    expect(groups).toBeDefined();
//    expect(users).toBeUndefined();
//  });
//
//  it("syncs using group filter", async () => {
//    stateService.getSync.mockResolvedValue(
//      getSyncConfiguration({ users: true, groups: true, groupFilter: INTEGRATION_GROUP_FILTER }),
//    );
//
//    const [groups, users] = await directoryService.getEntries(true, true);
//
//    expect(groups).toBeDefined();
//    expect(users).toBeDefined();
//  });
//
//  it("throws when credentials are invalid", async () => {
//    stateService.getDirectory
//      .calledWith(DirectoryType.OneLogin)
//      .mockResolvedValue(
//        getOneLoginConfiguration({ clientId: "bad-client-id", clientSecret: "bad-client-secret" }),
//      );
//    stateService.getSync.mockResolvedValue(getSyncConfiguration({ users: true, groups: true }));
//
//    await expect(directoryService.getEntries(true, true)).rejects.toThrow();
//  });
//});
