import * as fs from "fs";
import * as path from "path";

import { I18nService as BaseI18nService } from "@/libs/services/baseI18n.service";

export class I18nService extends BaseI18nService {
  constructor(systemLanguage: string, localesDirectory: string) {
    super(systemLanguage, localesDirectory, async (formattedLocale: string) => {
      let localesJson: string;

      try {
        // When running as a Node.js SEA, load locale from embedded asset
        const { isSea, getAsset } = await import("node:sea");
        if (isSea()) {
          localesJson = getAsset(`locales/${formattedLocale}/messages.json`, "utf8") as string;
          return JSON.parse(localesJson.replace(/^\uFEFF/, ""));
        }
      } catch {
        // node:sea not available (e.g. running under ts-node or older Node)
      }

      const filePath = path.join(
        __dirname,
        this.localesDirectory + "/" + formattedLocale + "/messages.json",
      );
      localesJson = fs.readFileSync(filePath, "utf8");
      const locales = JSON.parse(localesJson.replace(/^\uFEFF/, "")); // strip the BOM
      return Promise.resolve(locales);
    });
  }
}
