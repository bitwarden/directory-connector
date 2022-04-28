import { SecureNoteType } from "jslib-common/enums/secureNoteType";
import { SecureNoteData } from "jslib-common/models/data/secureNoteData";
import { SecureNote } from "jslib-common/models/domain/secureNote";

describe("SecureNote", () => {
  let data: SecureNoteData;

  beforeEach(() => {
    data = {
      type: SecureNoteType.Generic,
    };
  });

  it("Convert from empty", () => {
    const data = new SecureNoteData();
    const secureNote = new SecureNote(data);

    expect(secureNote).toEqual({
      type: undefined,
    });
  });

  it("Convert", () => {
    const secureNote = new SecureNote(data);

    expect(secureNote).toEqual({
      type: 0,
    });
  });

  it("toSecureNoteData", () => {
    const secureNote = new SecureNote(data);
    expect(secureNote.toSecureNoteData()).toEqual(data);
  });

  it("Decrypt", async () => {
    const secureNote = new SecureNote();
    secureNote.type = SecureNoteType.Generic;

    const view = await secureNote.decrypt(null);

    expect(view).toEqual({
      type: 0,
    });
  });
});
