import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useGame } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { SectorSelectCard } from '@/components/SectorSelectCard';
import { resolveIndustryPresentation } from '@/domain/config/IndustryPresentation';
import { getIndustry } from '@/domain/config/EconomyConfig';
import { getUnlockedIndustries } from '@/domain/progression/ProgressionService';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export function FoundCompanyForm() {
  const { config, dashboard, playerCashMinor, foundSubsidiary, formatMoneyCompact } = useGame();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [industryId, setIndustryId] = useState<string | null>(null);

  const slotsAvailable = dashboard.subsidiaryCount < dashboard.maxSubsidiaries;
  if (!slotsAvailable) {
    return null;
  }

  const unlockedIndustries = getUnlockedIndustries(config, dashboard.businessRank);
  const foundingCost = config.subsidiaryCompanyCostMinor;
  const canAfford = playerCashMinor >= foundingCost;
  const trimmedName = companyName.trim();
  const canSubmit = Boolean(industryId) && trimmedName.length >= 2 && canAfford;
  const selectedIndustry = industryId ? getIndustry(config, industryId) : null;
  const selectedPresentation = selectedIndustry ? resolveIndustryPresentation(selectedIndustry) : null;
  const foundName = trimmedName ? trimmedName.toUpperCase() : t.foundCompany.foundFallback;

  const handleFound = () => {
    if (!industryId) {
      return;
    }
    const result = foundSubsidiary(trimmedName, industryId);
    if (result.success) {
      setCompanyName('');
      setIndustryId(null);
      setExpanded(false);
      return;
    }
    Alert.alert(t.foundCompany.alertTitle, result.errorMessage);
  };

  return (
    <View style={styles.container}>
      {!expanded ? (
        <Pressable onPress={() => setExpanded(true)} style={styles.slotPrompt}>
          <Text style={styles.slotTitle}>{t.foundCompany.emptySlotTitle}</Text>
          <Text style={styles.slotMeta}>
            {interpolate(t.foundCompany.emptySlotMeta, {
              rank: dashboard.businessRank,
              used: dashboard.subsidiaryCount,
              max: dashboard.maxSubsidiaries,
              cost: formatMoneyCompact(foundingCost),
            })}
          </Text>
          <Text style={styles.slotAction}>{t.foundCompany.emptySlotAction}</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{t.foundCompany.formTitle}</Text>
            <Pressable onPress={() => setExpanded(false)} hitSlop={12}>
              <Text style={styles.cancel}>{t.common.cancel}</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {interpolate(t.foundCompany.hint, {
              cost: formatMoneyCompact(foundingCost),
              cash: formatMoneyCompact(playerCashMinor),
            })}
          </Text>

          <Text style={styles.fieldLabel}>{t.common.companyName}</Text>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder={t.onboarding.companyPlaceholder}
            placeholderTextColor={colors.muted}
            style={[styles.input, trimmedName.length >= 2 && styles.inputValid]}
            maxLength={28}
          />

          <Text style={styles.fieldLabel}>{t.common.industry}</Text>
          <View style={styles.sectorGrid}>
            {unlockedIndustries.map((industry) => (
              <SectorSelectCard
                key={industry.id}
                industry={industry}
                selected={industryId === industry.id}
                onPress={() => setIndustryId(industry.id)}
                formatRevenue={formatMoneyCompact}
              />
            ))}
          </View>

          {selectedPresentation ? (
            <Card accentColor={selectedPresentation.accentColor} style={styles.focusCard}>
              <Text style={styles.focusKicker}>{t.common.bestFocus}</Text>
              <Text style={styles.focusHint}>{selectedPresentation.focusHint}</Text>
            </Card>
          ) : null}

          <PrimaryButton
            label={interpolate(t.foundCompany.foundButton, {
              name: foundName,
              cost: formatMoneyCompact(foundingCost),
            })}
            onPress={handleFound}
            disabled={!canSubmit}
          />
          {!canAfford ? (
            <Text style={styles.warning}>
              {interpolate(t.foundCompany.needMoreCash, {
                amount: formatMoneyCompact(foundingCost - playerCashMinor),
              })}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  slotPrompt: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${colors.primary}40`,
    borderRadius: 8,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: `${colors.primary}06`,
  },
  slotTitle: { fontFamily: fonts.display, fontSize: fontSizes.md, color: colors.text, fontWeight: '700' },
  slotMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted },
  slotAction: { fontFamily: fonts.display, fontSize: fontSizes.sm, color: colors.primary, marginTop: spacing.xs },
  form: {
    borderWidth: 1,
    borderColor: `${colors.primary}28`,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontFamily: fonts.display, fontSize: fontSizes.lg, color: colors.primary, fontWeight: '800' },
  cancel: { fontFamily: fonts.mono, fontSize: fontSizes.sm, color: colors.muted },
  hint: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18 },
  fieldLabel: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, letterSpacing: 1 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontFamily: fonts.display,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  inputValid: { borderColor: `${colors.primary}40` },
  sectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  focusCard: { marginTop: spacing.xs },
  focusKicker: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, letterSpacing: 1, marginBottom: spacing.xs },
  focusHint: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18 },
  warning: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.warning, textAlign: 'center' },
});
