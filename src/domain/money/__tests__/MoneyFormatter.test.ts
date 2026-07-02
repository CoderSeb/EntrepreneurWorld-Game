import {
  formatMoney,
  formatMoneyCompact,
  getDisplayCurrencyFromSettings,
  setActiveDisplayCurrency,
} from '@/domain/money/MoneyFormatter';
import { MoneyValue } from '@/domain/money/MoneyValue';

describe('MoneyFormatter', () => {
  afterEach(() => {
    setActiveDisplayCurrency('USD');
  });

  it('formats USD compact values by default', () => {
    expect(formatMoneyCompact(1_500_000_00)).toBe('$1.50M');
  });

  it('formats EUR with conversion rate', () => {
    expect(formatMoneyCompact(100_000_000, 'EUR')).toBe('€920K');
  });

  it('formats SEK with kr suffix', () => {
    expect(formatMoneyCompact(100_000_000, 'SEK')).toBe('10.50M kr');
  });

  it('does not mutate MoneyValue when formatting', () => {
    const money = MoneyValue.fromMajor(1000);
    formatMoneyCompact(money.amountMinorUnits, 'SEK');
    expect(money.amountMinorUnits).toBe(100_000);
  });

  it('reads display currency from save settings', () => {
    expect(getDisplayCurrencyFromSettings({ display_currency: 'EUR' })).toBe('EUR');
    expect(getDisplayCurrencyFromSettings({ display_currency: 'invalid' })).toBe('USD');
  });

  it('formats full SEK currency', () => {
    const formatted = formatMoney(10_000_000, 'SEK');
    expect(formatted).toMatch(/kr/);
  });
});
