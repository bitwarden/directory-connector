import {
  interceptConsole,
  restoreConsole,
} from "jslib-common/../spec/services/consolelog.service.spec";

import { ConsoleLogService } from "jslib-node/cli/services/consoleLog.service";

let caughtMessage: any = {};

describe("CLI Console log service", () => {
  let logService: ConsoleLogService;
  beforeEach(() => {
    caughtMessage = {};
    interceptConsole(caughtMessage);
    logService = new ConsoleLogService(true);
  });

  afterAll(() => {
    restoreConsole();
  });

  it("should redirect all console to error if BW_RESPONSE env is true", () => {
    process.env.BW_RESPONSE = "true";

    logService.debug("this is a debug message");
    expect(caughtMessage).toMatchObject({
      error: { 0: "this is a debug message" },
    });
  });

  it("should not redirect console to error if BW_RESPONSE != true", () => {
    process.env.BW_RESPONSE = "false";

    logService.debug("debug");
    logService.info("info");
    logService.warning("warning");
    logService.error("error");

    expect(caughtMessage).toMatchObject({
      log: { 0: "info" },
      warn: { 0: "warning" },
      error: { 0: "error" },
    });
  });
});
