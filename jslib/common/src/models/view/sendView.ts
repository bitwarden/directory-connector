import { SendType } from "../../enums/sendType";
import { Utils } from "../../misc/utils";
import { Send } from "../domain/send";
import { SymmetricCryptoKey } from "../domain/symmetricCryptoKey";

import { SendFileView } from "./sendFileView";
import { SendTextView } from "./sendTextView";
import { View } from "./view";

export class SendView implements View {
  id: string = null;
  accessId: string = null;
  name: string = null;
  notes: string = null;
  key: ArrayBuffer;
  cryptoKey: SymmetricCryptoKey;
  type: SendType = null;
  text = new SendTextView();
  file = new SendFileView();
  maxAccessCount?: number = null;
  accessCount = 0;
  revisionDate: Date = null;
  deletionDate: Date = null;
  expirationDate: Date = null;
  password: string = null;
  disabled = false;
  hideEmail = false;

  constructor(s?: Send) {
    if (!s) {
      return;
    }

    this.id = s.id;
    this.accessId = s.accessId;
    this.type = s.type;
    this.maxAccessCount = s.maxAccessCount;
    this.accessCount = s.accessCount;
    this.revisionDate = s.revisionDate;
    this.deletionDate = s.deletionDate;
    this.expirationDate = s.expirationDate;
    this.disabled = s.disabled;
    this.password = s.password;
    this.hideEmail = s.hideEmail;
  }

  get urlB64Key(): string {
    return Utils.fromBufferToUrlB64(this.key);
  }

  get maxAccessCountReached(): boolean {
    if (this.maxAccessCount == null) {
      return false;
    }
    return this.accessCount >= this.maxAccessCount;
  }

  get expired(): boolean {
    if (this.expirationDate == null) {
      return false;
    }
    return this.expirationDate <= new Date();
  }

  get pendingDelete(): boolean {
    return this.deletionDate <= new Date();
  }
}
