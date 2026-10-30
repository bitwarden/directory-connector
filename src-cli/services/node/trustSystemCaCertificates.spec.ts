import * as tls from "tls";

import { mock } from "jest-mock-extended";

import { LogService } from "@/libs/abstractions/log.service";

import { trustSystemCaCertificates } from "./trustSystemCaCertificates";

describe("trustSystemCaCertificates", () => {
  let getCACertificatesSpy: jest.SpiedFunction<typeof tls.getCACertificates>;
  let setDefaultCACertificatesSpy: jest.SpiedFunction<typeof tls.setDefaultCACertificates>;
  let logService: LogService;

  beforeEach(() => {
    getCACertificatesSpy = jest.spyOn(tls, "getCACertificates");
    setDefaultCACertificatesSpy = jest
      .spyOn(tls, "setDefaultCACertificates")
      .mockImplementation(() => {});
    logService = mock<LogService>();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("merges the OS trust store into Node's default CA certificates", () => {
    const defaultCerts = ["bundled-ca-1", "bundled-ca-2"];
    const systemCerts = ["os-trusted-ca"];
    getCACertificatesSpy.mockImplementation((store?: string) =>
      store === "system" ? systemCerts : defaultCerts,
    );

    trustSystemCaCertificates(logService);

    expect(setDefaultCACertificatesSpy).toHaveBeenCalledWith([...defaultCerts, ...systemCerts]);
    expect(logService.warning).not.toHaveBeenCalled();
  });

  it("logs a warning and does not throw when the OS trust store cannot be read", () => {
    getCACertificatesSpy.mockImplementation((store?: string) => {
      if (store === "system") {
        throw new Error("unable to read system trust store");
      }
      return ["bundled-ca-1"];
    });

    expect(() => trustSystemCaCertificates(logService)).not.toThrow();

    expect(setDefaultCACertificatesSpy).not.toHaveBeenCalled();
    expect(logService.warning).toHaveBeenCalledWith(
      expect.stringContaining("Failed to read system CA trust store"),
    );
  });
});
