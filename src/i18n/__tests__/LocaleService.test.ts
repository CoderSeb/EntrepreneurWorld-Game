import {
  detectDeviceLocale,
  getLocaleFromSettings,
  isSupportedLocale,
  LOCALE_SETTING_KEY,
} from '@/i18n/LocaleService';
import { DEFAULT_LOCALE, SupportedLocale } from '@/i18n/locales';

describe('LocaleService', () => {
  it('reads persisted locale from settings', () => {
    expect(getLocaleFromSettings({ [LOCALE_SETTING_KEY]: 'sv' })).toBe('sv');
    expect(getLocaleFromSettings({ [LOCALE_SETTING_KEY]: 'en' })).toBe('en');
  });

  it('rejects unknown locale values', () => {
    expect(isSupportedLocale('de')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
  });

  it('falls back to device locale when setting is missing', () => {
    const original = Intl.DateTimeFormat;
    const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ locale: 'sv-SE' }),
        }) as Intl.DateTimeFormat,
    );

    expect(getLocaleFromSettings({})).toBe('sv');

    spy.mockRestore();
    void original;
  });

  it('defaults to English for unsupported device locales', () => {
    const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ locale: 'de-DE' }),
        }) as Intl.DateTimeFormat,
    );

    expect(detectDeviceLocale()).toBe(DEFAULT_LOCALE);

    spy.mockRestore();
  });
});
