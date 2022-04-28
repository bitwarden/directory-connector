import { CipherType } from "../../enums/cipherType";
import { CardView } from "../../models/view/cardView";
import { CipherView } from "../../models/view/cipherView";
import { IdentityView } from "../../models/view/identityView";
import { Importer } from "../importer";

import { IgnoredProperties, OnePasswordCsvImporter } from "./onepasswordCsvImporter";

export class OnePasswordMacCsvImporter extends OnePasswordCsvImporter implements Importer {
  setCipherType(value: any, cipher: CipherView) {
    const onePassType = this.getValueOrDefault(this.getProp(value, "type"), "Login");
    switch (onePassType) {
      case "Credit Card":
        cipher.type = CipherType.Card;
        cipher.card = new CardView();
        IgnoredProperties.push("type");
        break;
      case "Identity":
        cipher.type = CipherType.Identity;
        cipher.identity = new IdentityView();
        IgnoredProperties.push("type");
        break;
      case "Login":
      case "Secure Note":
        IgnoredProperties.push("type");
        break;
      default:
        break;
    }
  }
}
