import { CipherType } from "../enums/cipherType";
import { SecureNoteType } from "../enums/secureNoteType";
import { ImportResult } from "../models/domain/importResult";
import { SecureNoteView } from "../models/view/secureNoteView";

import { BaseImporter } from "./baseImporter";
import { Importer } from "./importer";

export class MSecureCsvImporter extends BaseImporter implements Importer {
  parse(data: string): Promise<ImportResult> {
    const result = new ImportResult();
    const results = this.parseCsv(data, false);
    if (results == null) {
      result.success = false;
      return Promise.resolve(result);
    }

    results.forEach((value) => {
      if (value.length < 3) {
        return;
      }

      const folderName =
        this.getValueOrDefault(value[0], "Unassigned") !== "Unassigned" ? value[0] : null;
      this.processFolder(result, folderName);

      const cipher = this.initLoginCipher();
      cipher.name = this.getValueOrDefault(value[2], "--");

      if (value[1] === "Web Logins" || value[1] === "Login") {
        cipher.login.uris = this.makeUriArray(value[4]);
        cipher.login.username = this.getValueOrDefault(value[5]);
        cipher.login.password = this.getValueOrDefault(value[6]);
        cipher.notes = !this.isNullOrWhitespace(value[3]) ? value[3].split("\\n").join("\n") : null;
      } else if (value.length > 3) {
        cipher.type = CipherType.SecureNote;
        cipher.secureNote = new SecureNoteView();
        cipher.secureNote.type = SecureNoteType.Generic;
        for (let i = 3; i < value.length; i++) {
          if (!this.isNullOrWhitespace(value[i])) {
            cipher.notes += value[i] + "\n";
          }
        }
      }

      if (!this.isNullOrWhitespace(value[1]) && cipher.type !== CipherType.Login) {
        cipher.name = value[1] + ": " + cipher.name;
      }

      this.cleanupCipher(cipher);
      result.ciphers.push(cipher);
    });

    if (this.organization) {
      this.moveFoldersToCollections(result);
    }

    result.success = true;
    return Promise.resolve(result);
  }
}
