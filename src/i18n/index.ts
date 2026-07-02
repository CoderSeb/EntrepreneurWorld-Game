import { en } from '@/i18n/en';

/** Returns localized strings. English-only until additional locales are added. */
export function t(): typeof en {
  return en;
}
