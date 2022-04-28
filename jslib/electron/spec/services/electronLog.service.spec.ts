import { ElectronLogService } from "jslib-electron/services/electronLog.service";

describe("ElectronLogService", () => {
  it("sets dev based on electron method", () => {
    process.env.ELECTRON_IS_DEV = "1";
    const logService = new ElectronLogService();
    expect(logService).toEqual(expect.objectContaining({ isDev: true }) as any);
  });
});
