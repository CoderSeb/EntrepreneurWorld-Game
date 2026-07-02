import { en } from '@/i18n/en';
import { sv } from '@/i18n/sv';
import type { TranslationDictionary } from '@/i18n/types';

/** Register new locales here — add a catalog entry and dictionary import. */
export const LOCALE_CATALOG = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish' },
] as const;

export type SupportedLocale = (typeof LOCALE_CATALOG)[number]['code'];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

const translations: Record<SupportedLocale, TranslationDictionary> = {
  en,
  sv,
};

export function getTranslations(locale: SupportedLocale): TranslationDictionary {
  return translations[locale] ?? translations[DEFAULT_LOCALE];
}
