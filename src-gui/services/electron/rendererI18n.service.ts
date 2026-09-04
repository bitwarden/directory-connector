import { I18nService as BaseI18nService } from "@/libs/services/baseI18n.service";

export class RendererI18nService extends BaseI18nService {
  constructor(systemLanguage: string, localesDirectory: string) {
    super(systemLanguage, localesDirectory, async (formattedLocale: string) => {
      const response = await fetch(`${localesDirectory}/${formattedLocale}/messages.json`);
      if (!response.ok) {
        throw new Error(`Failed to load locale ${formattedLocale}: ${response.status}`);
      }
      const text = await response.text();
      return JSON.parse(text.replace(/^\ufeff/, ""));
    });
  }
}
