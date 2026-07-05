/** Integer minor units (100 = 1 major unit). See ADR-0011. */

import {
  formatMoneyCompact as formatMoneyCompactImpl,
  formatMoney as formatMoneyImpl,
} from '@/domain/money/MoneyFormatter';
import { MINOR_UNITS_PER_MAJOR } from '@/domain/money/moneyConstants';

export { MINOR_UNITS_PER_MAJOR } from '@/domain/money/moneyConstants';

export class MoneyValue {
  readonly amountMinorUnits: number;

  constructor(amountMinor: number = 0) {
    this.amountMinorUnits = amountMinor;
  }

  static zero(): MoneyValue {
    return new MoneyValue(0);
  }

  static fromMajor(majorUnits: number, minorUnits: number = 0): MoneyValue {
    return new MoneyValue(majorUnits * MINOR_UNITS_PER_MAJOR + minorUnits);
  }

  static fromMinor(amountMinor: number): MoneyValue {
    return new MoneyValue(amountMinor);
  }

  add(other: MoneyValue): MoneyValue {
    return new MoneyValue(this.amountMinorUnits + other.amountMinorUnits);
  }

  subtract(other: MoneyValue): MoneyValue {
    return new MoneyValue(this.amountMinorUnits - other.amountMinorUnits);
  }

  multiplyScalar(scalar: number): MoneyValue {
    return new MoneyValue(Math.round(this.amountMinorUnits * scalar));
  }

  isNegative(): boolean {
    return this.amountMinorUnits < 0;
  }

  isZero(): boolean {
    return this.amountMinorUnits === 0;
  }

  equalsValue(other: MoneyValue): boolean {
    return this.amountMinorUnits === other.amountMinorUnits;
  }
}

export function formatMoneyCompact(minorUnits: number): string {
  return formatMoneyCompactImpl(minorUnits);
}

export function formatMoney(minorUnits: number): string {
  return formatMoneyImpl(minorUnits);
}

export {
  formatMoneyCompact as formatMoneyCompactWithCurrency,
  formatMoney as formatMoneyWithCurrency,
  setActiveDisplayCurrency,
  getActiveDisplayCurrency,
  getDisplayCurrencyFromSettings,
  isDisplayCurrencyCode,
  DISPLAY_CURRENCY_SETTING_KEY,
} from '@/domain/money/MoneyFormatter';
export type { DisplayCurrencyCode } from '@/domain/money/MoneyFormatter';
