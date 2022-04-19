import { I18nService } from "jslib-common/abstractions/i18n.service";

export class I18nMockService implements I18nService {
  locale: string;
  supportedTranslationLocales: string[];
  translationLocale: string;
  collator: Intl.Collator;
  localeNames: Map<string, string>;

  constructor(private lookupTable: Record<string, string>) {}

  t(id: string, p1?: string, p2?: string, p3?: string) {
    return this.lookupTable[id];
  }

  translate(id: string, p1?: string, p2?: string, p3?: string) {
    return this.t(id, p1, p2, p3);
  }
}
