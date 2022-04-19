export abstract class I18nService {
  locale: string;
  supportedTranslationLocales: string[];
  translationLocale: string;
  collator: Intl.Collator;
  localeNames: Map<string, string>;
  t: (id: string, p1?: string, p2?: string, p3?: string) => string;
  translate: (id: string, p1?: string, p2?: string, p3?: string) => string;
}
