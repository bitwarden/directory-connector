import { FSecureFskImporter as Importer } from "jslib-common/importers/fsecureFskImporter";

const TestDataWithStyleSetToWebsite: string = JSON.stringify({
  data: {
    "8d58b5cf252dd06fbd98f5289e918ab1": {
      color: "#00baff",
      reatedDate: 1609302913,
      creditCvv: "",
      creditExpiry: "",
      creditNumber: "",
      favorite: 0,
      modifiedDate: 1609302913,
      notes: "note",
      password: "word",
      passwordList: [],
      passwordModifiedDate: 1609302913,
      rev: 1,
      service: "My first pass",
      style: "website",
      type: 1,
      url: "https://bitwarden.com",
      username: "pass",
    },
  },
});

const TestDataWithStyleSetToGlobe: string = JSON.stringify({
  data: {
    "8d58b5cf252dd06fbd98f5289e918ab1": {
      color: "#00baff",
      reatedDate: 1609302913,
      creditCvv: "",
      creditExpiry: "",
      creditNumber: "",
      favorite: 0,
      modifiedDate: 1609302913,
      notes: "note",
      password: "word",
      passwordList: [],
      passwordModifiedDate: 1609302913,
      rev: 1,
      service: "My first pass",
      style: "globe",
      type: 1,
      url: "https://bitwarden.com",
      username: "pass",
    },
  },
});

describe("FSecure FSK Importer", () => {
  it("should parse data with style set to website", async () => {
    const importer = new Importer();
    const result = await importer.parse(TestDataWithStyleSetToWebsite);
    expect(result != null).toBe(true);

    const cipher = result.ciphers.shift();
    expect(cipher.login.username).toEqual("pass");
    expect(cipher.login.password).toEqual("word");
    expect(cipher.login.uris.length).toEqual(1);
    const uriView = cipher.login.uris.shift();
    expect(uriView.uri).toEqual("https://bitwarden.com");
  });

  it("should parse data with style set to globe", async () => {
    const importer = new Importer();
    const result = await importer.parse(TestDataWithStyleSetToGlobe);
    expect(result != null).toBe(true);

    const cipher = result.ciphers.shift();
    expect(cipher.login.username).toEqual("pass");
    expect(cipher.login.password).toEqual("word");
    expect(cipher.login.uris.length).toEqual(1);
    const uriView = cipher.login.uris.shift();
    expect(uriView.uri).toEqual("https://bitwarden.com");
  });
});
