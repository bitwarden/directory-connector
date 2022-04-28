import { ConsoleLogService } from "jslib-common/services/consoleLog.service";

const originalConsole = console;
let caughtMessage: any;

declare let console: any;

export function interceptConsole(interceptions: any): object {
  console = {
    log: function () {
      // eslint-disable-next-line
      interceptions.log = arguments;
    },
    warn: function () {
      // eslint-disable-next-line
      interceptions.warn = arguments;
    },
    error: function () {
      // eslint-disable-next-line
      interceptions.error = arguments;
    },
  };
  return interceptions;
}

export function restoreConsole() {
  console = originalConsole;
}

describe("ConsoleLogService", () => {
  let logService: ConsoleLogService;
  beforeEach(() => {
    caughtMessage = {};
    interceptConsole(caughtMessage);
    logService = new ConsoleLogService(true);
  });

  afterAll(() => {
    restoreConsole();
  });

  it("filters messages below the set threshold", () => {
    logService = new ConsoleLogService(true, () => true);
    logService.debug("debug");
    logService.info("info");
    logService.warning("warning");
    logService.error("error");

    expect(caughtMessage).toEqual({});
  });
  it("only writes debug messages in dev mode", () => {
    logService = new ConsoleLogService(false);

    logService.debug("debug message");
    expect(caughtMessage.log).toBeUndefined();
  });

  it("writes debug/info messages to console.log", () => {
    logService.debug("this is a debug message");
    expect(caughtMessage).toMatchObject({
      log: { "0": "this is a debug message" },
    });

    logService.info("this is an info message");
    expect(caughtMessage).toMatchObject({
      log: { "0": "this is an info message" },
    });
  });
  it("writes warning messages to console.warn", () => {
    logService.warning("this is a warning message");
    expect(caughtMessage).toMatchObject({
      warn: { 0: "this is a warning message" },
    });
  });
  it("writes error messages to console.error", () => {
    logService.error("this is an error message");
    expect(caughtMessage).toMatchObject({
      error: { 0: "this is an error message" },
    });
  });

  it("times with output to info", async () => {
    logService.time();
    await new Promise((r) => setTimeout(r, 250));
    const duration = logService.timeEnd();
    expect(duration[0]).toBe(0);
    expect(duration[1]).toBeGreaterThan(0);
    expect(duration[1]).toBeLessThan(500 * 10e6);

    expect(caughtMessage).toEqual(expect.arrayContaining([]));
    expect(caughtMessage.log.length).toBe(1);
    expect(caughtMessage.log[0]).toEqual(expect.stringMatching(/^default: \d+\.?\d*ms$/));
  });

  it("filters time output", async () => {
    logService = new ConsoleLogService(true, () => true);
    logService.time();
    logService.timeEnd();

    expect(caughtMessage).toEqual({});
  });
});
