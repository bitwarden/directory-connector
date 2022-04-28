import { CipherType } from "../../enums/cipherType";
import { CardView } from "../../models/view/cardView";
import { CipherView } from "../../models/view/cipherView";
import { IdentityView } from "../../models/view/identityView";
import { LoginView } from "../../models/view/loginView";
import { Importer } from "../importer";

import { CipherImportContext } from "./cipherImportContext";
import { OnePasswordCsvImporter } from "./onepasswordCsvImporter";

export class OnePasswordWinCsvImporter extends OnePasswordCsvImporter implements Importer {
  constructor() {
    super();
    this.identityPropertyParsers.push(this.setIdentityAddress);
  }

  setCipherType(value: any, cipher: CipherView) {
    cipher.type = CipherType.Login;
    cipher.login = new LoginView();

    if (
      !this.isNullOrWhitespace(this.getPropByRegexp(value, /\d+: number/i)) &&
      !this.isNullOrWhitespace(this.getPropByRegexp(value, /\d+: expiry date/i))
    ) {
      cipher.type = CipherType.Card;
      cipher.card = new CardView();
    }

    if (
      !this.isNullOrWhitespace(this.getPropByRegexp(value, /name \d+: first name/i)) ||
      !this.isNullOrWhitespace(this.getPropByRegexp(value, /name \d+: initial/i)) ||
      !this.isNullOrWhitespace(this.getPropByRegexp(value, /name \d+: last name/i)) ||
      !this.isNullOrWhitespace(this.getPropByRegexp(value, /internet \d+: email/i))
    ) {
      cipher.type = CipherType.Identity;
      cipher.identity = new IdentityView();
    }
  }

  setIdentityAddress(context: CipherImportContext) {
    if (context.lowerProperty.match(/address \d+: address/i)) {
      this.processKvp(context.cipher, "address", context.importRecord[context.property]);
      return true;
    }
    return false;
  }

  setCreditCardExpiry(context: CipherImportContext) {
    if (
      this.isNullOrWhitespace(context.cipher.card.expiration) &&
      context.lowerProperty.includes("expiry date")
    ) {
      const expSplit = (context.importRecord[context.property] as string).split("/");
      context.cipher.card.expMonth = expSplit[0];
      if (context.cipher.card.expMonth[0] === "0" && context.cipher.card.expMonth.length === 2) {
        context.cipher.card.expMonth = context.cipher.card.expMonth.substr(1, 1);
      }
      context.cipher.card.expYear = expSplit[2].length > 4 ? expSplit[2].substr(0, 4) : expSplit[2];
      return true;
    }
    return false;
  }
}
