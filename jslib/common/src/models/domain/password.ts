import { PasswordHistoryData } from "../data/passwordHistoryData";
import { PasswordHistoryView } from "../view/passwordHistoryView";

import Domain from "./domainBase";
import { EncString } from "./encString";
import { SymmetricCryptoKey } from "./symmetricCryptoKey";

export class Password extends Domain {
  password: EncString;
  lastUsedDate: Date;

  constructor(obj?: PasswordHistoryData) {
    super();
    if (obj == null) {
      return;
    }

    this.buildDomainModel(this, obj, {
      password: null,
    });
    this.lastUsedDate = new Date(obj.lastUsedDate);
  }

  decrypt(orgId: string, encKey?: SymmetricCryptoKey): Promise<PasswordHistoryView> {
    return this.decryptObj(
      new PasswordHistoryView(this),
      {
        password: null,
      },
      orgId,
      encKey
    );
  }

  toPasswordHistoryData(): PasswordHistoryData {
    const ph = new PasswordHistoryData();
    ph.lastUsedDate = this.lastUsedDate.toISOString();
    this.buildDataModel(this, ph, {
      password: null,
    });
    return ph;
  }
}
