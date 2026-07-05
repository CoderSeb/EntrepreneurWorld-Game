import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { EconomyBreakdownLineUi } from '@/domain/economy/EconomyBreakdownService';
import { useTranslation } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

type EconomyBreakdownPanelProps = {
  revenueLines: EconomyBreakdownLineUi[];
  expenseLines: EconomyBreakdownLineUi[];
  grossRevenueMinorPerHour: number;
  totalExpensesMinorPerHour: number;
  netProfitMinorPerHour: number;
  formatMoney: (minor: number) => string;
};

function BreakdownLineRow({
  label,
  amountMinorPerHour,
  formatMoney,
  perHour,
  valueStyle,
  signMode,
  isCredit = false,
}: {
  label: string;
  amountMinorPerHour: number;
  formatMoney: (minor: number) => string;
  perHour: string;
  valueStyle: object;
  signMode: 'revenue' | 'expense';
  isCredit?: boolean;
}) {
  const prefix =
    isCredit ? '−' : signMode === 'expense' ? '−' : amountMinorPerHour < 0 ? '−' : '+';
  const valueText = isCredit
    ? `(${formatMoney(amountMinorPerHour)}${perHour})`
    : `${prefix}${formatMoney(Math.abs(amountMinorPerHour))}${perHour}`;

  return (
    <View style={styles.lineRow}>
      <Text style={styles.lineLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.lineValue, valueStyle]}>{valueText}</Text>
    </View>
  );
}

export function EconomyBreakdownPanel({
  revenueLines,
  expenseLines,
  grossRevenueMinorPerHour,
  totalExpensesMinorPerHour,
  netProfitMinorPerHour,
  formatMoney,
}: EconomyBreakdownPanelProps) {
  const { t } = useTranslation();
  const perHour = t.common.perHour;
  const visibleRevenue = revenueLines.filter((line) => line.amountMinorPerHour !== 0);
  const visibleExpenses = expenseLines.filter((line) => line.amountMinorPerHour !== 0);
  const profitPositive = netProfitMinorPerHour >= 0;

  return (
    <Card accentColor={colors.primary}>
      <Text style={styles.sectionTitle}>{t.company.economyRevenueSection}</Text>
      {visibleRevenue.length === 0 ? (
        <Text style={styles.emptyMeta}>{t.company.economyRevenueEmpty}</Text>
      ) : (
        visibleRevenue.map((line) => (
          <BreakdownLineRow
            key={line.id}
            label={line.label}
            amountMinorPerHour={line.amountMinorPerHour}
            formatMoney={formatMoney}
            perHour={perHour}
            valueStyle={line.amountMinorPerHour < 0 ? styles.negative : styles.positive}
            signMode="revenue"
          />
        ))
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t.company.economyRevenueTotal}</Text>
        <Text style={[styles.totalValue, styles.positive]}>
          +{formatMoney(grossRevenueMinorPerHour)}
          {perHour}
        </Text>
      </View>

      <View style={styles.sectionDivider} />

      <Text style={styles.sectionTitle}>{t.company.economyExpensesSection}</Text>
      {visibleExpenses.length === 0 ? (
        <Text style={styles.emptyMeta}>{t.company.economyExpensesEmpty}</Text>
      ) : (
        visibleExpenses.map((line) => (
          <BreakdownLineRow
            key={line.id}
            label={line.label}
            amountMinorPerHour={line.amountMinorPerHour}
            formatMoney={formatMoney}
            perHour={perHour}
            valueStyle={line.isCredit ? styles.positive : styles.expense}
            signMode="expense"
            isCredit={line.isCredit}
          />
        ))
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t.company.economyExpensesTotal}</Text>
        <Text style={[styles.totalValue, styles.expense]}>
          −{formatMoney(totalExpensesMinorPerHour)}
          {perHour}
        </Text>
      </View>

      <View style={styles.profitDivider} />

      <View style={styles.profitRow}>
        <View style={styles.profitTextBlock}>
          <Text style={styles.profitLabel}>{t.company.economyNetProfit}</Text>
          <Text style={styles.profitHint}>{t.company.economyNetProfitHint}</Text>
        </View>
        <Text style={[styles.profitValue, profitPositive ? styles.positive : styles.negative]}>
          {profitPositive ? '+' : '−'}
          {formatMoney(Math.abs(netProfitMinorPerHour))}
          {perHour}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.micro,
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  emptyMeta: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: 6,
  },
  lineLabel: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  lineValue: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: '700',
  },
  totalValue: {
    fontFamily: fonts.display,
    fontSize: fontSizes.sm,
    fontWeight: '800',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: `${colors.primary}18`,
    marginVertical: spacing.md,
  },
  profitDivider: {
    height: 2,
    backgroundColor: `${colors.primary}30`,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  profitTextBlock: {
    flex: 1,
    gap: 2,
  },
  profitLabel: {
    fontFamily: fonts.display,
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: '800',
  },
  profitHint: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.micro,
    color: colors.muted,
  },
  profitValue: {
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    fontWeight: '900',
  },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  expense: { color: colors.warning },
});
