import { LOCALE_CATALOG, SupportedLocale } from '@/i18n/locales';

export const LOCALE_SETTING_KEY = 'locale';

const SUPPORTED_LOCALE_CODES = new Set<string>(LOCALE_CATALOG.map((entry) => entry.code));

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && SUPPORTED_LOCALE_CODES.has(value);
}

export function detectDeviceLocale(): SupportedLocale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (tag.startsWith('sv')) {
      return 'sv';
    }
  } catch {
    // Fall back to English when the runtime locale is unavailable.
  }
  return 'en';
}

/** Reads persisted locale or falls back to device language on first launch. */
export function getLocaleFromSettings(settings: Record<string, unknown>): SupportedLocale {
  const raw = settings[LOCALE_SETTING_KEY];
  if (isSupportedLocale(raw)) {
    return raw;
  }
  return detectDeviceLocale();
}
