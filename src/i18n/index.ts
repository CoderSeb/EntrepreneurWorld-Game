export { interpolate } from '@/i18n/interpolate';
export {
  detectDeviceLocale,
  getLocaleFromSettings,
  isSupportedLocale,
  LOCALE_SETTING_KEY,
} from '@/i18n/LocaleService';
export {
  DEFAULT_LOCALE,
  getTranslations,
  LOCALE_CATALOG,
  type SupportedLocale,
} from '@/i18n/locales';
export type { TranslationDictionary } from '@/i18n/types';

import { useGameFormat } from '@/context/GameFormatContext';

/** Active UI strings for the current locale. Re-renders when the player changes language. */
export function useTranslation() {
  const { locale, setLocale, strings } = useGameFormat();
  return { locale, setLocale, t: strings };
}
