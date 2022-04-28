import Substitute, { Arg } from "@fluffy-spoon/substitute";

import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { AttachmentData } from "jslib-common/models/data/attachmentData";
import { Attachment } from "jslib-common/models/domain/attachment";
import { SymmetricCryptoKey } from "jslib-common/models/domain/symmetricCryptoKey";
import { ContainerService } from "jslib-common/services/container.service";

import { makeStaticByteArray, mockEnc } from "../utils";

describe("Attachment", () => {
  let data: AttachmentData;

  beforeEach(() => {
    data = {
      id: "id",
      url: "url",
      fileName: "fileName",
      key: "key",
      size: "1100",
      sizeName: "1.1 KB",
    };
  });

  it("Convert from empty", () => {
    const data = new AttachmentData();
    const attachment = new Attachment(data);

    expect(attachment).toEqual({
      id: null,
      url: null,
      size: undefined,
      sizeName: null,
      key: null,
      fileName: null,
    });
  });

  it("Convert", () => {
    const attachment = new Attachment(data);

    expect(attachment).toEqual({
      size: "1100",
      id: "id",
      url: "url",
      sizeName: "1.1 KB",
      fileName: { encryptedString: "fileName", encryptionType: 0 },
      key: { encryptedString: "key", encryptionType: 0 },
    });
  });

  it("toAttachmentData", () => {
    const attachment = new Attachment(data);
    expect(attachment.toAttachmentData()).toEqual(data);
  });

  it("Decrypt", async () => {
    const attachment = new Attachment();
    attachment.id = "id";
    attachment.url = "url";
    attachment.size = "1100";
    attachment.sizeName = "1.1 KB";
    attachment.key = mockEnc("key");
    attachment.fileName = mockEnc("fileName");

    const cryptoService = Substitute.for<CryptoService>();
    cryptoService.getOrgKey(null).resolves(null);
    cryptoService.decryptToBytes(Arg.any(), Arg.any()).resolves(makeStaticByteArray(32));

    (window as any).bitwardenContainerService = new ContainerService(cryptoService);

    const view = await attachment.decrypt(null);

    expect(view).toEqual({
      id: "id",
      url: "url",
      size: "1100",
      sizeName: "1.1 KB",
      fileName: "fileName",
      key: expect.any(SymmetricCryptoKey),
    });
  });
});
