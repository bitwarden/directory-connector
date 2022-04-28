import Substitute, { Arg } from "@fluffy-spoon/substitute";

import { UriMatchType } from "jslib-common/enums/uriMatchType";
import { LoginData } from "jslib-common/models/data/loginData";
import { Login } from "jslib-common/models/domain/login";
import { LoginUri } from "jslib-common/models/domain/loginUri";
import { LoginUriView } from "jslib-common/models/view/loginUriView";

import { mockEnc } from "../utils";

describe("Login DTO", () => {
  it("Convert from empty LoginData", () => {
    const data = new LoginData();
    const login = new Login(data);

    expect(login).toEqual({
      passwordRevisionDate: null,
      autofillOnPageLoad: undefined,
      username: null,
      password: null,
      totp: null,
    });
  });

  it("Convert from full LoginData", () => {
    const data: LoginData = {
      uris: [{ uri: "uri", match: UriMatchType.Domain }],
      username: "username",
      password: "password",
      passwordRevisionDate: "2022-01-31T12:00:00.000Z",
      totp: "123",
      autofillOnPageLoad: false,
    };
    const login = new Login(data);

    expect(login).toEqual({
      passwordRevisionDate: new Date("2022-01-31T12:00:00.000Z"),
      autofillOnPageLoad: false,
      username: { encryptedString: "username", encryptionType: 0 },
      password: { encryptedString: "password", encryptionType: 0 },
      totp: { encryptedString: "123", encryptionType: 0 },
      uris: [{ match: 0, uri: { encryptedString: "uri", encryptionType: 0 } }],
    });
  });

  it("Initialize without LoginData", () => {
    const login = new Login();

    expect(login).toEqual({});
  });

  it("Decrypts correctly", async () => {
    const loginUri = Substitute.for<LoginUri>();
    const loginUriView = new LoginUriView();
    loginUriView.uri = "decrypted uri";
    loginUri.decrypt(Arg.any()).resolves(loginUriView);

    const login = new Login();
    login.uris = [loginUri];
    login.username = mockEnc("encrypted username");
    login.password = mockEnc("encrypted password");
    login.passwordRevisionDate = new Date("2022-01-31T12:00:00.000Z");
    login.totp = mockEnc("encrypted totp");
    login.autofillOnPageLoad = true;

    const loginView = await login.decrypt(null);
    expect(loginView).toEqual({
      username: "encrypted username",
      password: "encrypted password",
      passwordRevisionDate: new Date("2022-01-31T12:00:00.000Z"),
      totp: "encrypted totp",
      uris: [
        {
          match: null,
          _uri: "decrypted uri",
          _domain: null,
          _hostname: null,
          _host: null,
          _canLaunch: null,
        },
      ],
      autofillOnPageLoad: true,
    });
  });

  it("Converts from LoginData and back", () => {
    const data: LoginData = {
      uris: [{ uri: "uri", match: UriMatchType.Domain }],
      username: "username",
      password: "password",
      passwordRevisionDate: "2022-01-31T12:00:00.000Z",
      totp: "123",
      autofillOnPageLoad: false,
    };
    const login = new Login(data);

    const loginData = login.toLoginData();

    expect(loginData).toEqual(data);
  });
});
