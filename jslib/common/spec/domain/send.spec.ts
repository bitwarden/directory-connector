import Substitute, { Arg, SubstituteOf } from "@fluffy-spoon/substitute";

import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { SendType } from "jslib-common/enums/sendType";
import { SendData } from "jslib-common/models/data/sendData";
import { EncString } from "jslib-common/models/domain/encString";
import { Send } from "jslib-common/models/domain/send";
import { SendText } from "jslib-common/models/domain/sendText";
import { ContainerService } from "jslib-common/services/container.service";

import { makeStaticByteArray, mockEnc } from "../utils";

describe("Send", () => {
  let data: SendData;

  beforeEach(() => {
    data = {
      id: "id",
      accessId: "accessId",
      userId: "userId",
      type: SendType.Text,
      name: "encName",
      notes: "encNotes",
      text: {
        text: "encText",
        hidden: true,
      },
      file: null,
      key: "encKey",
      maxAccessCount: null,
      accessCount: 10,
      revisionDate: "2022-01-31T12:00:00.000Z",
      expirationDate: "2022-01-31T12:00:00.000Z",
      deletionDate: "2022-01-31T12:00:00.000Z",
      password: "password",
      disabled: false,
      hideEmail: true,
    };
  });

  it("Convert from empty", () => {
    const data = new SendData();
    const send = new Send(data);

    expect(send).toEqual({
      id: null,
      accessId: null,
      userId: null,
      type: undefined,
      name: null,
      notes: null,
      text: undefined,
      file: undefined,
      key: null,
      maxAccessCount: undefined,
      accessCount: undefined,
      revisionDate: null,
      expirationDate: null,
      deletionDate: null,
      password: undefined,
      disabled: undefined,
      hideEmail: undefined,
    });
  });

  it("Convert", () => {
    const send = new Send(data);

    expect(send).toEqual({
      id: "id",
      accessId: "accessId",
      userId: "userId",
      type: SendType.Text,
      name: { encryptedString: "encName", encryptionType: 0 },
      notes: { encryptedString: "encNotes", encryptionType: 0 },
      text: {
        text: { encryptedString: "encText", encryptionType: 0 },
        hidden: true,
      },
      key: { encryptedString: "encKey", encryptionType: 0 },
      maxAccessCount: null,
      accessCount: 10,
      revisionDate: new Date("2022-01-31T12:00:00.000Z"),
      expirationDate: new Date("2022-01-31T12:00:00.000Z"),
      deletionDate: new Date("2022-01-31T12:00:00.000Z"),
      password: "password",
      disabled: false,
      hideEmail: true,
    });
  });

  it("Decrypt", async () => {
    const text = Substitute.for<SendText>();
    text.decrypt(Arg.any()).resolves("textView" as any);

    const send = new Send();
    send.id = "id";
    send.accessId = "accessId";
    send.userId = "userId";
    send.type = SendType.Text;
    send.name = mockEnc("name");
    send.notes = mockEnc("notes");
    send.text = text;
    send.key = mockEnc("key");
    send.accessCount = 10;
    send.revisionDate = new Date("2022-01-31T12:00:00.000Z");
    send.expirationDate = new Date("2022-01-31T12:00:00.000Z");
    send.deletionDate = new Date("2022-01-31T12:00:00.000Z");
    send.password = "password";
    send.disabled = false;
    send.hideEmail = true;

    const cryptoService = Substitute.for<CryptoService>();
    cryptoService.decryptToBytes(send.key, null).resolves(makeStaticByteArray(32));
    cryptoService.makeSendKey(Arg.any()).resolves("cryptoKey" as any);

    (window as any).bitwardenContainerService = new ContainerService(cryptoService);

    const view = await send.decrypt();

    text.received(1).decrypt("cryptoKey" as any);
    (send.name as SubstituteOf<EncString>).received(1).decrypt(null, "cryptoKey" as any);

    expect(view).toMatchObject({
      id: "id",
      accessId: "accessId",
      name: "name",
      notes: "notes",
      type: 0,
      key: expect.anything(),
      cryptoKey: "cryptoKey",
      file: expect.anything(),
      text: "textView",
      maxAccessCount: undefined,
      accessCount: 10,
      revisionDate: new Date("2022-01-31T12:00:00.000Z"),
      expirationDate: new Date("2022-01-31T12:00:00.000Z"),
      deletionDate: new Date("2022-01-31T12:00:00.000Z"),
      password: "password",
      disabled: false,
      hideEmail: true,
    });
  });
});
