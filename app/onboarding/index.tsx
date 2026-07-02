import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatBox } from '@/components/StatBox';
import { Card } from '@/components/Card';
import { SectorSelectCard } from '@/components/SectorSelectCard';
import { resolveIndustryPresentation } from '@/domain/config/IndustryPresentation';
import { getIndustry } from '@/domain/config/EconomyConfig';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

export default function OnboardingScreen() {
  const { completeOnboarding, config, formatMoneyCompact } = useGame();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [congName, setCongName] = useState('');
  const [compName, setCompName] = useState('');
  const [industryId, setIndustryId] = useState<string | null>(null);

  const industries = Object.values(config.industries).filter((i) => i.minBusinessRank <= 1);
  const selectedIndustry = industryId ? getIndustry(config, industryId) : null;
  const selectedPresentation = selectedIndustry ? resolveIndustryPresentation(selectedIndustry) : null;
  const launchName = compName ? compName.toUpperCase() : t.onboarding.launchFallback;

  const finish = () => {
    if (!industryId || congName.trim().length < 2 || compName.trim().length < 2) return;
    const result = completeOnboarding(congName.trim(), compName.trim(), industryId);
    if (result.success) {
      router.replace('/(tabs)');
      return;
    }
    Alert.alert(t.foundCompany.alertTitle, result.errorMessage);
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {step === 0 && (
        <LinearGradient colors={['#0d1a2e', colors.backgroundDeep, colors.background]} style={styles.hero}>
          <Text style={styles.kicker}>{t.onboarding.welcomeKicker}</Text>
          <Text style={styles.heroTitle}>{t.onboarding.title}</Text>
          <Text style={styles.season}>{t.onboarding.season}</Text>
          <Text style={styles.body}>{t.onboarding.intro}</Text>
          <PrimaryButton label={t.onboarding.begin} onPress={() => setStep(1)} />
        </LinearGradient>
      )}

      {step === 1 && (
        <View style={styles.stepBlock}>
          <Text style={styles.stepKicker}>{t.onboarding.step1of2}</Text>
          <Text style={styles.stepTitle}>{t.onboarding.nameConglomerate}</Text>
          <Text style={styles.fieldLabel}>{t.common.conglomerateName}</Text>
          <TextInput
            value={congName}
            onChangeText={setCongName}
            placeholder={t.onboarding.conglomeratePlaceholder}
            placeholderTextColor={colors.muted}
            style={[styles.input, congName.length >= 2 && styles.inputValid]}
            maxLength={32}
          />
          <Card accentColor={colors.warning} style={styles.statsCard}>
            <Text style={styles.cardKicker}>{t.onboarding.startingPosition}</Text>
            <View style={styles.statsGrid}>
              <StatBox
                label={t.onboarding.seedCapital}
                value={formatMoneyCompact(config.startingCashMinor)}
                valueColor={colors.primary}
              />
              <StatBox
                label={t.onboarding.companySlots}
                value={`${config.companyLimits[0]?.maxCompanies ?? 2}`}
              />
              <StatBox
                label={t.onboarding.startingRank}
                value={`${t.common.rank} 1`}
                valueColor={colors.muted}
              />
              <StatBox label={t.onboarding.holdingCost} value={formatMoneyCompact(config.holdingCompanyCostMinor)} />
            </View>
          </Card>
          <PrimaryButton label={t.onboarding.continue} onPress={() => setStep(2)} disabled={congName.trim().length < 2} />
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepBlock}>
          <Text style={styles.stepKicker}>{t.onboarding.step2of2}</Text>
          <Text style={styles.stepTitle}>{t.onboarding.chooseSector}</Text>
          <Text style={styles.fieldLabel}>{t.common.companyName}</Text>
          <TextInput
            value={compName}
            onChangeText={setCompName}
            placeholder={t.onboarding.companyPlaceholder}
            placeholderTextColor={colors.muted}
            style={[styles.input, compName.length >= 2 && styles.inputValid]}
            maxLength={28}
          />
          <Text style={styles.fieldLabel}>{t.common.selectIndustry}</Text>
          <View style={styles.sectorGrid}>
            {industries.map((industry) => (
              <SectorSelectCard
                key={industry.id}
                industry={industry}
                config={config}
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
            label={interpolate(t.onboarding.launchCompany, { name: launchName })}
            onPress={finish}
            disabled={!industryId || compName.trim().length < 2}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingBottom: spacing.xl + 8 },
  hero: {
    flex: 1,
    minHeight: 420,
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  stepBlock: { gap: spacing.lg, paddingTop: spacing.md },
  kicker: { fontFamily: fonts.display, fontSize: fontSizes.sm, color: colors.muted, letterSpacing: 3, textAlign: 'center' },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: fontSizes.hero,
    color: colors.primary,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 36,
  },
  season: { fontFamily: fonts.display, fontSize: fontSizes.sm, color: colors.accentPurple, letterSpacing: 2, textAlign: 'center' },
  body: { fontFamily: fonts.body, fontSize: fontSizes.xl, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  stepKicker: { fontFamily: fonts.display, fontSize: fontSizes.sm, color: colors.muted, letterSpacing: 2 },
  stepTitle: { fontFamily: fonts.display, fontSize: fontSizes.xxl, color: colors.text, fontWeight: '800' },
  fieldLabel: { fontFamily: fonts.mono, fontSize: fontSizes.sm, color: colors.muted, letterSpacing: 1 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    color: colors.text,
  },
  inputValid: { borderColor: `${colors.primary}40` },
  statsCard: { marginVertical: spacing.sm },
  cardKicker: { fontFamily: fonts.mono, fontSize: fontSizes.sm, color: colors.warning, marginBottom: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  focusCard: { marginTop: spacing.xs },
  focusKicker: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, letterSpacing: 1, marginBottom: spacing.xs },
  focusHint: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18 },
});
