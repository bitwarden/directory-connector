import Substitute, { Arg } from "@fluffy-spoon/substitute";

import { SendType } from "jslib-common/enums/sendType";
import { SendAccess } from "jslib-common/models/domain/sendAccess";
import { SendText } from "jslib-common/models/domain/sendText";
import { SendAccessResponse } from "jslib-common/models/response/sendAccessResponse";

import { mockEnc } from "../utils";

describe("SendAccess", () => {
  let request: SendAccessResponse;

  beforeEach(() => {
    request = {
      id: "id",
      type: SendType.Text,
      name: "encName",
      file: null,
      text: {
        text: "encText",
        hidden: true,
      },
      expirationDate: new Date("2022-01-31T12:00:00.000Z"),
      creatorIdentifier: "creatorIdentifier",
    } as SendAccessResponse;
  });

  it("Convert from empty", () => {
    const request = new SendAccessResponse({});
    const sendAccess = new SendAccess(request);

    expect(sendAccess).toEqual({
      id: null,
      type: undefined,
      name: null,
      creatorIdentifier: null,
      expirationDate: null,
    });
  });

  it("Convert", () => {
    const sendAccess = new SendAccess(request);

    expect(sendAccess).toEqual({
      id: "id",
      type: 0,
      name: { encryptedString: "encName", encryptionType: 0 },
      text: {
        hidden: true,
        text: { encryptedString: "encText", encryptionType: 0 },
      },
      expirationDate: new Date("2022-01-31T12:00:00.000Z"),
      creatorIdentifier: "creatorIdentifier",
    });
  });

  it("Decrypt", async () => {
    const sendAccess = new SendAccess();
    sendAccess.id = "id";
    sendAccess.type = SendType.Text;
    sendAccess.name = mockEnc("name");

    const text = Substitute.for<SendText>();
    text.decrypt(Arg.any()).resolves({} as any);
    sendAccess.text = text;

    sendAccess.expirationDate = new Date("2022-01-31T12:00:00.000Z");
    sendAccess.creatorIdentifier = "creatorIdentifier";

    const view = await sendAccess.decrypt(null);

    text.received(1).decrypt(Arg.any());

    expect(view).toEqual({
      id: "id",
      type: 0,
      name: "name",
      text: {},
      file: expect.anything(),
      expirationDate: new Date("2022-01-31T12:00:00.000Z"),
      creatorIdentifier: "creatorIdentifier",
    });
  });
});
