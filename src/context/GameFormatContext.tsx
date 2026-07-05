import { createContext, useContext } from 'react';
import { DisplayCurrencyCode } from '@/domain/money/MoneyFormatter';
import { SupportedLocale } from '@/i18n/locales';
import type { TranslationDictionary } from '@/i18n/types';

export type GameFormatContextValue = {
  displayCurrency: DisplayCurrencyCode;
  setDisplayCurrency: (currency: DisplayCurrencyCode) => void;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  strings: TranslationDictionary;
  formatMoneyCompact: (minorUnits: number) => string;
  formatMoney: (minorUnits: number) => string;
};

export const GameFormatContext = createContext<GameFormatContextValue | null>(null);

export function useGameFormat(): GameFormatContextValue {
  const ctx = useContext(GameFormatContext);
  if (!ctx) {
    throw new Error('useGameFormat must be used within GameProvider');
  }
  return ctx;
}
