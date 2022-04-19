import { CipherType } from "../enums/cipherType";
import { SecureNoteType } from "../enums/secureNoteType";
import { ImportResult } from "../models/domain/importResult";

import { BaseImporter } from "./baseImporter";
import { Importer } from "./importer";

export class AvastJsonImporter extends BaseImporter implements Importer {
  parse(data: string): Promise<ImportResult> {
    const result = new ImportResult();
    const results = JSON.parse(data);
    if (results == null) {
      result.success = false;
      return Promise.resolve(result);
    }

    if (results.logins != null) {
      results.logins.forEach((value: any) => {
        const cipher = this.initLoginCipher();
        cipher.name = this.getValueOrDefault(value.custName);
        cipher.notes = this.getValueOrDefault(value.note);
        cipher.login.uris = this.makeUriArray(value.url);
        cipher.login.password = this.getValueOrDefault(value.pwd);
        cipher.login.username = this.getValueOrDefault(value.loginName);
        this.cleanupCipher(cipher);
        result.ciphers.push(cipher);
      });
    }

    if (results.notes != null) {
      results.notes.forEach((value: any) => {
        const cipher = this.initLoginCipher();
        cipher.type = CipherType.SecureNote;
        cipher.secureNote.type = SecureNoteType.Generic;
        cipher.name = this.getValueOrDefault(value.label);
        cipher.notes = this.getValueOrDefault(value.text);
        this.cleanupCipher(cipher);
        result.ciphers.push(cipher);
      });
    }

    if (results.cards != null) {
      results.cards.forEach((value: any) => {
        const cipher = this.initLoginCipher();
        cipher.type = CipherType.Card;
        cipher.name = this.getValueOrDefault(value.custName);
        cipher.notes = this.getValueOrDefault(value.note);
        cipher.card.cardholderName = this.getValueOrDefault(value.holderName);
        cipher.card.number = this.getValueOrDefault(value.cardNumber);
        cipher.card.code = this.getValueOrDefault(value.cvv);
        cipher.card.brand = this.getCardBrand(cipher.card.number);
        if (value.expirationDate != null) {
          if (value.expirationDate.month != null) {
            cipher.card.expMonth = value.expirationDate.month + "";
          }
          if (value.expirationDate.year != null) {
            cipher.card.expYear = value.expirationDate.year + "";
          }
        }
        this.cleanupCipher(cipher);
        result.ciphers.push(cipher);
      });
    }

    result.success = true;
    return Promise.resolve(result);
  }
}
