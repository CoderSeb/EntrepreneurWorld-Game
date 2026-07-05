import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { StatBox } from '@/components/StatBox';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const SALARY_PRESETS = [0.25, 0.5, 1] as const;

export function TreasuryPanel() {
  const {
    dashboard,
    companies,
    config,
    transferDividend,
    withdrawSalary,
    previewSalary,
    formatMoneyCompact,
  } = useGame();
  const { t } = useTranslation();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    companies[0]?.id ?? null,
  );

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? null;
  const taxRatePercent = Math.round(config.treasury.salaryTaxRate * 100);

  const maxSalaryMinor = dashboard.holdingCash.amountMinorUnits;
  const salaryPreview = useMemo(
    () => (maxSalaryMinor > 0 ? previewSalary(maxSalaryMinor) : null),
    [maxSalaryMinor, previewSalary],
  );

  const transferAll = () => {
    if (!selectedCompany) {
      return;
    }
    const amount = selectedCompany.cashBalanceMinor;
    if (amount < config.treasury.minTransferMinor) {
      Alert.alert(t.treasury.transferFailedTitle, t.treasury.transferTooSmall);
      return;
    }
    const result = transferDividend(selectedCompany.id, amount);
    if (!result.success) {
      Alert.alert(t.treasury.transferFailedTitle, result.errorMessage ?? t.treasury.transferFailedMessage);
      return;
    }
    Alert.alert(
      t.treasury.transferSuccessTitle,
      interpolate(t.treasury.transferSuccessMessage, {
        amount: formatMoneyCompact(amount),
        company: selectedCompany.name,
      }),
    );
  };

  const withdrawPreset = (ratio: number) => {
    const grossMinor = Math.floor(maxSalaryMinor * ratio);
    if (grossMinor < config.treasury.minSalaryMinor) {
      Alert.alert(t.treasury.salaryFailedTitle, t.treasury.salaryTooSmall);
      return;
    }
    const preview = previewSalary(grossMinor);
    Alert.alert(
      t.treasury.salaryConfirmTitle,
      interpolate(t.treasury.salaryConfirmMessage, {
        gross: formatMoneyCompact(preview.grossMinor),
        tax: formatMoneyCompact(preview.taxMinor),
        net: formatMoneyCompact(preview.netMinor),
        rate: taxRatePercent,
      }),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.treasury.withdrawSalary,
          onPress: () => {
            const result = withdrawSalary(grossMinor);
            if (!result.success) {
              Alert.alert(
                t.treasury.salaryFailedTitle,
                result.errorMessage ?? t.treasury.salaryFailedMessage,
              );
              return;
            }
            Alert.alert(
              t.treasury.salarySuccessTitle,
              interpolate(t.treasury.salarySuccessMessage, {
                net: formatMoneyCompact(result.data?.netMinor ?? preview.netMinor),
              }),
            );
          },
        },
      ],
    );
  };

  if (!dashboard.hasHolding) {
    return null;
  }

  return (
    <>
      <SectionHeader title={t.treasury.title} subtitle={t.treasury.subtitle} />
      <Card accentColor={colors.accentPurple}>
        <View style={styles.statRow}>
          <StatBox
            label={t.treasury.holdingTreasury}
            value={formatMoneyCompact(dashboard.holdingCash.amountMinorUnits)}
            valueColor={colors.primary}
            small
          />
          <StatBox
            label={t.treasury.personalCash}
            value={formatMoneyCompact(dashboard.personalCash.amountMinorUnits)}
            valueColor={colors.warning}
            small
          />
          <StatBox
            label={t.treasury.personalNetWorth}
            value={formatMoneyCompact(dashboard.personalNetWorth.amountMinorUnits)}
            valueColor={colors.success}
            small
          />
        </View>
        <Text style={styles.meta}>
          {interpolate(t.treasury.taxRateMeta, { rate: taxRatePercent })}
        </Text>
      </Card>

      <Card accentColor={colors.success}>
        <Text style={styles.cardTitle}>{t.treasury.dividendTitle}</Text>
        <Text style={styles.cardHint}>{t.treasury.dividendHint}</Text>
        {companies.length === 0 ? (
          <Text style={styles.meta}>{t.treasury.noSubsidiaries}</Text>
        ) : (
          <>
            <View style={styles.chipRow}>
              {companies.map((company) => {
                const selected = company.id === selectedCompanyId;
                return (
                  <Pressable
                    key={company.id}
                    onPress={() => setSelectedCompanyId(company.id)}
                    style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {company.name}
                    </Text>
                    <Text style={[styles.chipMeta, selected && styles.chipTextSelected]}>
                      {formatMoneyCompact(company.cashBalanceMinor)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <PrimaryButton
              label={t.treasury.transferAll}
              onPress={transferAll}
              disabled={!selectedCompany || selectedCompany.cashBalanceMinor < config.treasury.minTransferMinor}
            />
          </>
        )}
      </Card>

      <Card accentColor={colors.warning}>
        <Text style={styles.cardTitle}>{t.treasury.salaryTitle}</Text>
        <Text style={styles.cardHint}>{t.treasury.salaryHint}</Text>
        {salaryPreview ? (
          <Text style={styles.preview}>
            {interpolate(t.treasury.salaryPreviewMax, {
              gross: formatMoneyCompact(salaryPreview.grossMinor),
              tax: formatMoneyCompact(salaryPreview.taxMinor),
              net: formatMoneyCompact(salaryPreview.netMinor),
            })}
          </Text>
        ) : null}
        <View style={styles.presetRow}>
          {SALARY_PRESETS.map((ratio) => (
            <Pressable
              key={ratio}
              onPress={() => withdrawPreset(ratio)}
              disabled={maxSalaryMinor < config.treasury.minSalaryMinor}
              style={({ pressed }) => [
                styles.presetButton,
                pressed && styles.presetPressed,
                maxSalaryMinor < config.treasury.minSalaryMinor && styles.presetDisabled,
              ]}>
              <Text style={styles.presetLabel}>
                {interpolate(t.treasury.salaryPreset, { percent: Math.round(ratio * 100) })}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: spacing.sm },
  meta: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.micro,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardHint: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.micro,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.primary}08`,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}18`,
  },
  chipText: { fontFamily: fonts.display, fontSize: fontSizes.sm, color: colors.text },
  chipTextSelected: { color: colors.primary },
  chipMeta: { fontFamily: fonts.mono, fontSize: fontSizes.micro, color: colors.muted },
  preview: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  presetRow: { flexDirection: 'row', gap: spacing.sm },
  presetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: `${colors.warning}55`,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: `${colors.warning}10`,
  },
  presetPressed: { opacity: 0.85 },
  presetDisabled: { opacity: 0.45 },
  presetLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.micro,
    color: colors.warning,
    fontWeight: '700',
  },
});
