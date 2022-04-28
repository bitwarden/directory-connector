import { CipherType } from "../enums/cipherType";
import { FieldType } from "../enums/fieldType";
import { ImportResult } from "../models/domain/importResult";
import { CardView } from "../models/view/cardView";
import { CipherView } from "../models/view/cipherView";
import { FolderView } from "../models/view/folderView";

import { BaseImporter } from "./baseImporter";
import { Importer } from "./importer";

export class EnpassJsonImporter extends BaseImporter implements Importer {
  parse(data: string): Promise<ImportResult> {
    const result = new ImportResult();
    const results = JSON.parse(data);
    if (results == null || results.items == null || results.items.length === 0) {
      result.success = false;
      return Promise.resolve(result);
    }

    const foldersMap = new Map<string, string>();
    const foldersIndexMap = new Map<string, number>();
    const folderTree = this.buildFolderTree(results.folders);
    this.flattenFolderTree(null, folderTree, foldersMap);
    foldersMap.forEach((val, key) => {
      foldersIndexMap.set(key, result.folders.length);
      const f = new FolderView();
      f.name = val;
      result.folders.push(f);
    });

    results.items.forEach((item: any) => {
      if (item.folders != null && item.folders.length > 0 && foldersIndexMap.has(item.folders[0])) {
        result.folderRelationships.push([
          result.ciphers.length,
          foldersIndexMap.get(item.folders[0]),
        ]);
      }

      const cipher = this.initLoginCipher();
      cipher.name = this.getValueOrDefault(item.title);
      cipher.favorite = item.favorite > 0;

      if (item.template_type != null && item.fields != null && item.fields.length > 0) {
        if (
          item.template_type.indexOf("login.") === 0 ||
          item.template_type.indexOf("password.") === 0
        ) {
          this.processLogin(cipher, item.fields);
        } else if (item.template_type.indexOf("creditcard.") === 0) {
          this.processCard(cipher, item.fields);
        } else if (
          item.template_type.indexOf("identity.") < 0 &&
          item.fields.some((f: any) => f.type === "password" && !this.isNullOrWhitespace(f.value))
        ) {
          this.processLogin(cipher, item.fields);
        } else {
          this.processNote(cipher, item.fields);
        }
      }

      cipher.notes += "\n" + this.getValueOrDefault(item.note, "");
      this.convertToNoteIfNeeded(cipher);
      this.cleanupCipher(cipher);
      result.ciphers.push(cipher);
    });

    result.success = true;
    return Promise.resolve(result);
  }

  private processLogin(cipher: CipherView, fields: any[]) {
    const urls: string[] = [];
    fields.forEach((field: any) => {
      if (this.isNullOrWhitespace(field.value) || field.type === "section") {
        return;
      }

      if (
        (field.type === "username" || field.type === "email") &&
        this.isNullOrWhitespace(cipher.login.username)
      ) {
        cipher.login.username = field.value;
      } else if (field.type === "password" && this.isNullOrWhitespace(cipher.login.password)) {
        cipher.login.password = field.value;
      } else if (field.type === "totp" && this.isNullOrWhitespace(cipher.login.totp)) {
        cipher.login.totp = field.value;
      } else if (field.type === "url") {
        urls.push(field.value);
      } else {
        this.processKvp(
          cipher,
          field.label,
          field.value,
          field.sensitive === 1 ? FieldType.Hidden : FieldType.Text
        );
      }
    });
    cipher.login.uris = this.makeUriArray(urls);
  }

  private processCard(cipher: CipherView, fields: any[]) {
    cipher.card = new CardView();
    cipher.type = CipherType.Card;
    fields.forEach((field: any) => {
      if (
        this.isNullOrWhitespace(field.value) ||
        field.type === "section" ||
        field.type === "ccType"
      ) {
        return;
      }

      if (field.type === "ccName" && this.isNullOrWhitespace(cipher.card.cardholderName)) {
        cipher.card.cardholderName = field.value;
      } else if (field.type === "ccNumber" && this.isNullOrWhitespace(cipher.card.number)) {
        cipher.card.number = field.value;
        cipher.card.brand = this.getCardBrand(cipher.card.number);
      } else if (field.type === "ccCvc" && this.isNullOrWhitespace(cipher.card.code)) {
        cipher.card.code = field.value;
      } else if (field.type === "ccExpiry" && this.isNullOrWhitespace(cipher.card.expYear)) {
        if (!this.setCardExpiration(cipher, field.value)) {
          this.processKvp(
            cipher,
            field.label,
            field.value,
            field.sensitive === 1 ? FieldType.Hidden : FieldType.Text
          );
        }
      } else {
        this.processKvp(
          cipher,
          field.label,
          field.value,
          field.sensitive === 1 ? FieldType.Hidden : FieldType.Text
        );
      }
    });
  }

  private processNote(cipher: CipherView, fields: any[]) {
    fields.forEach((field: any) => {
      if (this.isNullOrWhitespace(field.value) || field.type === "section") {
        return;
      }
      this.processKvp(
        cipher,
        field.label,
        field.value,
        field.sensitive === 1 ? FieldType.Hidden : FieldType.Text
      );
    });
  }

  private buildFolderTree(folders: any[]): any[] {
    if (folders == null) {
      return [];
    }
    const folderTree: any[] = [];
    const map = new Map<string, any>([]);
    folders.forEach((obj: any) => {
      map.set(obj.uuid, obj);
      obj.children = [];
    });
    folders.forEach((obj: any) => {
      if (obj.parent_uuid != null && obj.parent_uuid !== "" && map.has(obj.parent_uuid)) {
        map.get(obj.parent_uuid).children.push(obj);
      } else {
        folderTree.push(obj);
      }
    });
    return folderTree;
  }

  private flattenFolderTree(titlePrefix: string, tree: any[], map: Map<string, string>) {
    if (tree == null) {
      return;
    }
    tree.forEach((f: any) => {
      if (f.title != null && f.title.trim() !== "") {
        let title = f.title.trim();
        if (titlePrefix != null && titlePrefix.trim() !== "") {
          title = titlePrefix + "/" + title;
        }
        map.set(f.uuid, title);
        if (f.children != null && f.children.length !== 0) {
          this.flattenFolderTree(title, f.children, map);
        }
      }
    });
  }
}
