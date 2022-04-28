import { SendTextData } from "../data/sendTextData";
import { SendTextView } from "../view/sendTextView";

import Domain from "./domainBase";
import { EncString } from "./encString";
import { SymmetricCryptoKey } from "./symmetricCryptoKey";

export class SendText extends Domain {
  text: EncString;
  hidden: boolean;

  constructor(obj?: SendTextData) {
    super();
    if (obj == null) {
      return;
    }

    this.hidden = obj.hidden;
    this.buildDomainModel(
      this,
      obj,
      {
        text: null,
      },
      []
    );
  }

  decrypt(key: SymmetricCryptoKey): Promise<SendTextView> {
    return this.decryptObj(
      new SendTextView(this),
      {
        text: null,
      },
      null,
      key
    );
  }
}
