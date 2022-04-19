import { CipherType } from "../enums/cipherType";
import { ImportResult } from "../models/domain/importResult";
import { CardView } from "../models/view/cardView";

import { BaseImporter } from "./baseImporter";
import { Importer } from "./importer";

export class RememBearCsvImporter extends BaseImporter implements Importer {
  parse(data: string): Promise<ImportResult> {
    const result = new ImportResult();
    const results = this.parseCsv(data, true);
    if (results == null) {
      result.success = false;
      return Promise.resolve(result);
    }

    results.forEach((value) => {
      if (value.trash === "true") {
        return;
      }
      const cipher = this.initLoginCipher();
      cipher.name = this.getValueOrDefault(value.name);
      cipher.notes = this.getValueOrDefault(value.notes);
      if (value.type === "LoginItem") {
        cipher.login.uris = this.makeUriArray(value.website);
        cipher.login.password = this.getValueOrDefault(value.password);
        cipher.login.username = this.getValueOrDefault(value.username);
      } else if (value.type === "CreditCardItem") {
        cipher.type = CipherType.Card;
        cipher.card = new CardView();
        cipher.card.cardholderName = this.getValueOrDefault(value.cardholder);
        cipher.card.number = this.getValueOrDefault(value.number);
        cipher.card.brand = this.getCardBrand(cipher.card.number);
        cipher.card.code = this.getValueOrDefault(value.verification);

        try {
          const expMonth = this.getValueOrDefault(value.expiryMonth);
          if (expMonth != null) {
            const expMonthNumber = parseInt(expMonth, null);
            if (expMonthNumber != null && expMonthNumber >= 1 && expMonthNumber <= 12) {
              cipher.card.expMonth = expMonthNumber.toString();
            }
          }
        } catch {
          // Ignore error
        }
        try {
          const expYear = this.getValueOrDefault(value.expiryYear);
          if (expYear != null) {
            const expYearNumber = parseInt(expYear, null);
            if (expYearNumber != null) {
              cipher.card.expYear = expYearNumber.toString();
            }
          }
        } catch {
          // Ignore error
        }

        const pin = this.getValueOrDefault(value.pin);
        if (pin != null) {
          this.processKvp(cipher, "PIN", pin);
        }
        const zip = this.getValueOrDefault(value.zipCode);
        if (zip != null) {
          this.processKvp(cipher, "Zip Code", zip);
        }
      }
      this.cleanupCipher(cipher);
      result.ciphers.push(cipher);
    });

    result.success = true;
    return Promise.resolve(result);
  }
}
