import { FolderData } from "@/jslib/common/src/models/data/folderData";
import { Folder } from "@/jslib/common/src/models/domain/folder";

import { mockEnc } from "../utils";

describe("Folder", () => {
  let data: FolderData;

  beforeEach(() => {
    data = {
      id: "id",
      userId: "userId",
      name: "encName",
      revisionDate: "2022-01-31T12:00:00.000Z",
    };
  });

  it("Convert", () => {
    const field = new Folder(data);

    expect(field).toEqual({
      id: "id",
      name: { encryptedString: "encName", encryptionType: 0 },
      revisionDate: new Date("2022-01-31T12:00:00.000Z"),
    });
  });

  it("Decrypt", async () => {
    const folder = new Folder();
    folder.id = "id";
    folder.name = mockEnc("encName");
    folder.revisionDate = new Date("2022-01-31T12:00:00.000Z");

    const view = await folder.decrypt();

    expect(view).toEqual({
      id: "id",
      name: "encName",
      revisionDate: new Date("2022-01-31T12:00:00.000Z"),
    });
  });
});
