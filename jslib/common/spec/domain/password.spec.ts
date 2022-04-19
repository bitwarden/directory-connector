import { PasswordHistoryData } from "jslib-common/models/data/passwordHistoryData";
import { Password } from "jslib-common/models/domain/password";

import { mockEnc } from "../utils";

describe("Password", () => {
  let data: PasswordHistoryData;

  beforeEach(() => {
    data = {
      password: "encPassword",
      lastUsedDate: "2022-01-31T12:00:00.000Z",
    };
  });

  it("Convert from empty", () => {
    const data = new PasswordHistoryData();
    const password = new Password(data);

    expect(password).toMatchObject({
      password: null,
    });
  });

  it("Convert", () => {
    const password = new Password(data);

    expect(password).toEqual({
      password: { encryptedString: "encPassword", encryptionType: 0 },
      lastUsedDate: new Date("2022-01-31T12:00:00.000Z"),
    });
  });

  it("toPasswordHistoryData", () => {
    const password = new Password(data);
    expect(password.toPasswordHistoryData()).toEqual(data);
  });

  it("Decrypt", async () => {
    const password = new Password();
    password.password = mockEnc("password");
    password.lastUsedDate = new Date("2022-01-31T12:00:00.000Z");

    const view = await password.decrypt(null);

    expect(view).toEqual({
      password: "password",
      lastUsedDate: new Date("2022-01-31T12:00:00.000Z"),
    });
  });
});
