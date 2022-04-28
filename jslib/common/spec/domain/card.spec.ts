import { CardData } from "jslib-common/models/data/cardData";
import { Card } from "jslib-common/models/domain/card";

import { mockEnc } from "../utils";

describe("Card", () => {
  let data: CardData;

  beforeEach(() => {
    data = {
      cardholderName: "encHolder",
      brand: "encBrand",
      number: "encNumber",
      expMonth: "encMonth",
      expYear: "encYear",
      code: "encCode",
    };
  });

  it("Convert from empty", () => {
    const data = new CardData();
    const card = new Card(data);

    expect(card).toEqual({
      cardholderName: null,
      brand: null,
      number: null,
      expMonth: null,
      expYear: null,
      code: null,
    });
  });

  it("Convert", () => {
    const card = new Card(data);

    expect(card).toEqual({
      cardholderName: { encryptedString: "encHolder", encryptionType: 0 },
      brand: { encryptedString: "encBrand", encryptionType: 0 },
      number: { encryptedString: "encNumber", encryptionType: 0 },
      expMonth: { encryptedString: "encMonth", encryptionType: 0 },
      expYear: { encryptedString: "encYear", encryptionType: 0 },
      code: { encryptedString: "encCode", encryptionType: 0 },
    });
  });

  it("toCardData", () => {
    const card = new Card(data);
    expect(card.toCardData()).toEqual(data);
  });

  it("Decrypt", async () => {
    const card = new Card();
    card.cardholderName = mockEnc("cardHolder");
    card.brand = mockEnc("brand");
    card.number = mockEnc("number");
    card.expMonth = mockEnc("expMonth");
    card.expYear = mockEnc("expYear");
    card.code = mockEnc("code");

    const view = await card.decrypt(null);

    expect(view).toEqual({
      _brand: "brand",
      _number: "number",
      _subTitle: null,
      cardholderName: "cardHolder",
      code: "code",
      expMonth: "expMonth",
      expYear: "expYear",
    });
  });
});
