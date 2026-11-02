import { describeServer } from "./describe-server";

describe("describeServer", () => {
  it("should recognize the US cloud", () => {
    expect(describeServer("https://api.bitwarden.com").kind).toBe("cloudUs");
  });

  it("should recognize the EU cloud from either an API or base URL", () => {
    expect(describeServer("https://api.bitwarden.eu").kind).toBe("cloudEu");
    expect(describeServer("https://vault.bitwarden.eu/api").kind).toBe("cloudEu");
  });

  it("should report the host of a self-hosted server", () => {
    expect(describeServer("https://bitwarden.company.com/api")).toEqual({
      kind: "selfHosted",
      host: "bitwarden.company.com",
    });
  });

  it("should not treat look-alike domains as the Bitwarden cloud", () => {
    expect(describeServer("https://api.bitwarden.com.evil.example").kind).toBe("selfHosted");
    expect(describeServer("https://notbitwarden.com").kind).toBe("selfHosted");
  });

  it("should fall back to self-hosted for a malformed URL", () => {
    expect(describeServer("not a url")).toEqual({ kind: "selfHosted", host: "not a url" });
  });
});
