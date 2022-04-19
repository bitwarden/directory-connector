import { UriMatchType } from "jslib-common/enums/uriMatchType";
import { LoginUriData } from "jslib-common/models/data/loginUriData";
import { LoginUri } from "jslib-common/models/domain/loginUri";

import { mockEnc } from "../utils";

describe("LoginUri", () => {
  let data: LoginUriData;

  beforeEach(() => {
    data = {
      uri: "encUri",
      match: UriMatchType.Domain,
    };
  });

  it("Convert from empty", () => {
    const data = new LoginUriData();
    const loginUri = new LoginUri(data);

    expect(loginUri).toEqual({
      match: null,
      uri: null,
    });
  });

  it("Convert", () => {
    const loginUri = new LoginUri(data);

    expect(loginUri).toEqual({
      match: 0,
      uri: { encryptedString: "encUri", encryptionType: 0 },
    });
  });

  it("toLoginUriData", () => {
    const loginUri = new LoginUri(data);
    expect(loginUri.toLoginUriData()).toEqual(data);
  });

  it("Decrypt", async () => {
    const loginUri = new LoginUri();
    loginUri.match = UriMatchType.Exact;
    loginUri.uri = mockEnc("uri");

    const view = await loginUri.decrypt(null);

    expect(view).toEqual({
      _canLaunch: null,
      _domain: null,
      _host: null,
      _hostname: null,
      _uri: "uri",
      match: 3,
    });
  });
});
