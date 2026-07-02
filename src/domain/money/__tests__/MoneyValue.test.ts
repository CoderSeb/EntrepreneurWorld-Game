import {
  MoneyValue,
  MINOR_UNITS_PER_MAJOR,
  formatMoney,
  formatMoneyCompact,
} from '../MoneyValue';

describe('MoneyValue', () => {
  it('stores minor units', () => {
    expect(MoneyValue.fromMajor(10, 50).amountMinorUnits).toBe(1050);
  });

  it('adds and subtracts', () => {
    const a = MoneyValue.fromMajor(100);
    const b = MoneyValue.fromMajor(25);
    expect(a.add(b).amountMinorUnits).toBe(12500);
    expect(a.subtract(b).amountMinorUnits).toBe(7500);
  });

  it('multiplies by scalar with rounding', () => {
    expect(MoneyValue.fromMinor(101).multiplyScalar(0.5).amountMinorUnits).toBe(51);
  });

  it('detects zero and negative', () => {
    expect(MoneyValue.zero().isZero()).toBe(true);
    expect(MoneyValue.fromMinor(-1).isNegative()).toBe(true);
  });

  it('compares equality', () => {
    expect(MoneyValue.fromMajor(1).equalsValue(MoneyValue.fromMinor(MINOR_UNITS_PER_MAJOR))).toBe(true);
  });
});

describe('formatMoney', () => {
  it('formats full currency', () => {
    expect(formatMoney(5000000)).toContain('50,000');
  });

  it('formats compact values', () => {
    expect(formatMoneyCompact(1_500_000_00)).toBe('$1.50M');
  });
});
