import { CollectionData } from "jslib-common/models/data/collectionData";
import { Collection } from "jslib-common/models/domain/collection";

import { mockEnc } from "../utils";

describe("Collection", () => {
  let data: CollectionData;

  beforeEach(() => {
    data = {
      id: "id",
      organizationId: "orgId",
      name: "encName",
      externalId: "extId",
      readOnly: true,
    };
  });

  it("Convert from empty", () => {
    const data = new CollectionData({} as any);
    const card = new Collection(data);

    expect(card).toEqual({
      externalId: null,
      hidePasswords: null,
      id: null,
      name: null,
      organizationId: null,
      readOnly: null,
    });
  });

  it("Convert", () => {
    const collection = new Collection(data);

    expect(collection).toEqual({
      id: "id",
      organizationId: "orgId",
      name: { encryptedString: "encName", encryptionType: 0 },
      externalId: "extId",
      readOnly: true,
      hidePasswords: null,
    });
  });

  it("Decrypt", async () => {
    const collection = new Collection();
    collection.id = "id";
    collection.organizationId = "orgId";
    collection.name = mockEnc("encName");
    collection.externalId = "extId";
    collection.readOnly = false;
    collection.hidePasswords = false;

    const view = await collection.decrypt();

    expect(view).toEqual({
      externalId: "extId",
      hidePasswords: false,
      id: "id",
      name: "encName",
      organizationId: "orgId",
      readOnly: false,
    });
  });
});
