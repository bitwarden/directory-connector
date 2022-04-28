import { SendFileData } from "jslib-common/models/data/sendFileData";
import { SendFile } from "jslib-common/models/domain/sendFile";

import { mockEnc } from "../utils";

describe("SendFile", () => {
  let data: SendFileData;

  beforeEach(() => {
    data = {
      id: "id",
      size: "1100",
      sizeName: "1.1 KB",
      fileName: "encFileName",
    };
  });

  it("Convert from empty", () => {
    const data = new SendFileData();
    const sendFile = new SendFile(data);

    expect(sendFile).toEqual({
      fileName: null,
      id: null,
      size: undefined,
      sizeName: null,
    });
  });

  it("Convert", () => {
    const sendFile = new SendFile(data);

    expect(sendFile).toEqual({
      id: "id",
      size: "1100",
      sizeName: "1.1 KB",
      fileName: { encryptedString: "encFileName", encryptionType: 0 },
    });
  });

  it("Decrypt", async () => {
    const sendFile = new SendFile();
    sendFile.id = "id";
    sendFile.size = "1100";
    sendFile.sizeName = "1.1 KB";
    sendFile.fileName = mockEnc("fileName");

    const view = await sendFile.decrypt(null);

    expect(view).toEqual({
      fileName: "fileName",
      id: "id",
      size: "1100",
      sizeName: "1.1 KB",
    });
  });
});
