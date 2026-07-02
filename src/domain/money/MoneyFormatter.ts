import { MINOR_UNITS_PER_MAJOR } from '@/domain/money/MoneyValue';

export type DisplayCurrencyCode = 'USD' | 'EUR' | 'SEK';

export const DISPLAY_CURRENCY_SETTING_KEY = 'display_currency';

const DISPLAY_RATES_FROM_USD: Record<DisplayCurrencyCode, number> = {
  USD: 1,
  EUR: 0.92,
  SEK: 10.5,
};

const CURRENCY_SYMBOLS: Record<DisplayCurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  SEK: 'kr',
};

let activeDisplayCurrency: DisplayCurrencyCode = 'USD';

export function isDisplayCurrencyCode(value: unknown): value is DisplayCurrencyCode {
  return value === 'USD' || value === 'EUR' || value === 'SEK';
}

export function getDisplayCurrencyFromSettings(settings: Record<string, unknown>): DisplayCurrencyCode {
  const raw = settings[DISPLAY_CURRENCY_SETTING_KEY];
  return isDisplayCurrencyCode(raw) ? raw : 'USD';
}

export function setActiveDisplayCurrency(currency: DisplayCurrencyCode): void {
  activeDisplayCurrency = currency;
}

export function getActiveDisplayCurrency(): DisplayCurrencyCode {
  return activeDisplayCurrency;
}

function toDisplayMajor(minorUnits: number, currency: DisplayCurrencyCode): number {
  const usdMajor = minorUnits / MINOR_UNITS_PER_MAJOR;
  return usdMajor * DISPLAY_RATES_FROM_USD[currency];
}

function compactSuffix(absMajor: number): { value: number; suffix: string } | null {
  if (absMajor >= 1e9) {
    return { value: absMajor / 1e9, suffix: 'B' };
  }
  if (absMajor >= 1e6) {
    return { value: absMajor / 1e6, suffix: 'M' };
  }
  if (absMajor >= 1e3) {
    return { value: absMajor / 1e3, suffix: 'K' };
  }
  return null;
}

export function formatMoneyCompact(
  minorUnits: number,
  currency: DisplayCurrencyCode = activeDisplayCurrency,
): string {
  const major = toDisplayMajor(minorUnits, currency);
  const sign = major < 0 ? '-' : '';
  const abs = Math.abs(major);
  const symbol = CURRENCY_SYMBOLS[currency];
  const compact = compactSuffix(abs);

  if (currency === 'SEK') {
    if (compact) {
      return `${sign}${compact.value.toFixed(compact.suffix === 'K' ? 0 : 2)}${compact.suffix} ${symbol}`;
    }
    return `${sign}${abs.toFixed(0)} ${symbol}`;
  }

  if (compact) {
    return `${sign}${symbol}${compact.value.toFixed(compact.suffix === 'K' ? 0 : 2)}${compact.suffix}`;
  }
  return `${sign}${symbol}${abs.toFixed(0)}`;
}

export function formatMoney(
  minorUnits: number,
  currency: DisplayCurrencyCode = activeDisplayCurrency,
): string {
  const major = toDisplayMajor(minorUnits, currency);
  if (currency === 'SEK') {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(major);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(major);
}
