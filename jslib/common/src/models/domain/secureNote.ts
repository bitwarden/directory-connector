import { SecureNoteType } from "../../enums/secureNoteType";
import { SecureNoteData } from "../data/secureNoteData";
import { SecureNoteView } from "../view/secureNoteView";

import Domain from "./domainBase";
import { SymmetricCryptoKey } from "./symmetricCryptoKey";

export class SecureNote extends Domain {
  type: SecureNoteType;

  constructor(obj?: SecureNoteData) {
    super();
    if (obj == null) {
      return;
    }

    this.type = obj.type;
  }

  decrypt(orgId: string, encKey?: SymmetricCryptoKey): Promise<SecureNoteView> {
    return Promise.resolve(new SecureNoteView(this));
  }

  toSecureNoteData(): SecureNoteData {
    const n = new SecureNoteData();
    n.type = this.type;
    return n;
  }
}
