import * as fs from "fs";
import * as path from "path";

import { I18nService as BaseI18nService } from "@/jslib/common/src/services/i18n.service";

export class I18nService extends BaseI18nService {
  constructor(systemLanguage: string, localesDirectory: string) {
    super(systemLanguage, localesDirectory, (formattedLocale: string) => {
      // When the renderer loads from a custom protocol (app://) rather than
      // file://, Node.js has no filesystem anchor and __dirname resolves inside
      // electron.asar. The preload sets globalThis.__appDirname to the real
      // build/ directory so locale files can always be found correctly.
      const baseDir = (global as any).__appDirname ?? __dirname;
      const filePath = path.join(
        baseDir,
        this.localesDirectory + "/" + formattedLocale + "/messages.json",
      );
      const localesJson = fs.readFileSync(filePath, "utf8");
      const locales = JSON.parse(localesJson.replace(/^\uFEFF/, "")); // strip the BOM
      return Promise.resolve(locales);
    });
  }
}
