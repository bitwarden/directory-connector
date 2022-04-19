import { SecureNoteType } from "../../enums/secureNoteType";
import { SecureNote as SecureNoteDomain } from "../domain/secureNote";
import { SecureNoteView } from "../view/secureNoteView";

export class SecureNote {
  static template(): SecureNote {
    const req = new SecureNote();
    req.type = SecureNoteType.Generic;
    return req;
  }

  static toView(req: SecureNote, view = new SecureNoteView()) {
    view.type = req.type;
    return view;
  }

  static toDomain(req: SecureNote, view = new SecureNoteDomain()) {
    view.type = req.type;
    return view;
  }

  type: SecureNoteType;

  constructor(o?: SecureNoteView | SecureNoteDomain) {
    if (o == null) {
      return;
    }

    this.type = o.type;
  }
}
