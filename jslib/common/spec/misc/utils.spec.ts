import { Utils } from "jslib-common/misc/utils";

describe("Utils Service", () => {
  describe("getDomain", () => {
    it("should fail for invalid urls", () => {
      expect(Utils.getDomain(null)).toBeNull();
      expect(Utils.getDomain(undefined)).toBeNull();
      expect(Utils.getDomain(" ")).toBeNull();
      expect(Utils.getDomain('https://bit!:"_&ward.com')).toBeNull();
      expect(Utils.getDomain("bitwarden")).toBeNull();
    });

    it("should fail for data urls", () => {
      expect(Utils.getDomain("data:image/jpeg;base64,AAA")).toBeNull();
    });

    it("should handle urls without protocol", () => {
      expect(Utils.getDomain("bitwarden.com")).toBe("bitwarden.com");
      expect(Utils.getDomain("wrong://bitwarden.com")).toBe("bitwarden.com");
    });

    it("should handle valid urls", () => {
      expect(Utils.getDomain("https://bitwarden")).toBe("bitwarden");
      expect(Utils.getDomain("https://bitwarden.com")).toBe("bitwarden.com");
      expect(Utils.getDomain("http://bitwarden.com")).toBe("bitwarden.com");
      expect(Utils.getDomain("http://vault.bitwarden.com")).toBe("bitwarden.com");
      expect(
        Utils.getDomain("https://user:password@bitwarden.com:8080/password/sites?and&query#hash")
      ).toBe("bitwarden.com");
      expect(Utils.getDomain("https://bitwarden.unknown")).toBe("bitwarden.unknown");
    });

    it("should support localhost and IP", () => {
      expect(Utils.getDomain("https://localhost")).toBe("localhost");
      expect(Utils.getDomain("https://192.168.1.1")).toBe("192.168.1.1");
    });

    it("should reject invalid hostnames", () => {
      expect(Utils.getDomain("https://mywebsite.com$.mywebsite.com")).toBeNull();
      expect(Utils.getDomain("https://mywebsite.com!.mywebsite.com")).toBeNull();
    });
  });

  describe("getHostname", () => {
    it("should fail for invalid urls", () => {
      expect(Utils.getHostname(null)).toBeNull();
      expect(Utils.getHostname(undefined)).toBeNull();
      expect(Utils.getHostname(" ")).toBeNull();
      expect(Utils.getHostname('https://bit!:"_&ward.com')).toBeNull();
      expect(Utils.getHostname("bitwarden")).toBeNull();
    });

    it("should handle valid urls", () => {
      expect(Utils.getHostname("bitwarden.com")).toBe("bitwarden.com");
      expect(Utils.getHostname("https://bitwarden.com")).toBe("bitwarden.com");
      expect(Utils.getHostname("http://bitwarden.com")).toBe("bitwarden.com");
      expect(Utils.getHostname("http://vault.bitwarden.com")).toBe("vault.bitwarden.com");
    });

    it("should support localhost and IP", () => {
      expect(Utils.getHostname("https://localhost")).toBe("localhost");
      expect(Utils.getHostname("https://192.168.1.1")).toBe("192.168.1.1");
    });
  });

  describe("newGuid", () => {
    it("should create a valid guid", () => {
      const validGuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(Utils.newGuid()).toMatch(validGuid);
    });
  });
});
