import { SendFileData } from "../data/sendFileData";
import { SendFileView } from "../view/sendFileView";

import Domain from "./domainBase";
import { EncString } from "./encString";
import { SymmetricCryptoKey } from "./symmetricCryptoKey";

export class SendFile extends Domain {
  id: string;
  size: string;
  sizeName: string;
  fileName: EncString;

  constructor(obj?: SendFileData) {
    super();
    if (obj == null) {
      return;
    }

    this.size = obj.size;
    this.buildDomainModel(
      this,
      obj,
      {
        id: null,
        sizeName: null,
        fileName: null,
      },
      ["id", "sizeName"]
    );
  }

  async decrypt(key: SymmetricCryptoKey): Promise<SendFileView> {
    const view = await this.decryptObj(
      new SendFileView(this),
      {
        fileName: null,
      },
      null,
      key
    );
    return view;
  }
}
