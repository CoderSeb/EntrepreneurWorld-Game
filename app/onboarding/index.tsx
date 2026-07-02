import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useGame } from '@/context/GameContext';
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
  const [step, setStep] = useState(0);
  const [congName, setCongName] = useState('');
  const [compName, setCompName] = useState('');
  const [industryId, setIndustryId] = useState<string | null>(null);

  const industries = Object.values(config.industries).filter((i) => i.minBusinessRank <= 1);
  const selectedIndustry = industryId ? getIndustry(config, industryId) : null;
  const selectedPresentation = selectedIndustry ? resolveIndustryPresentation(selectedIndustry) : null;

  const finish = () => {
    if (!industryId || congName.trim().length < 2 || compName.trim().length < 2) return;
    const result = completeOnboarding(congName.trim(), compName.trim(), industryId);
    if (result.success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      {step === 0 && (
        <LinearGradient colors={['#0d1a2e', colors.backgroundDeep, colors.background]} style={styles.hero}>
          <Text style={styles.kicker}>WELCOME TO</Text>
          <Text style={styles.heroTitle}>ENTREPRENEUR{'\n'}WORLD</Text>
          <Text style={styles.season}>SEASON IV</Text>
          <Text style={styles.body}>
            Build a global conglomerate. Manage companies, hire executives, and dominate markets.
          </Text>
          <PrimaryButton label="BEGIN YOUR EMPIRE →" onPress={() => setStep(1)} />
        </LinearGradient>
      )}

      {step === 1 && (
        <View style={styles.stepBlock}>
          <Text style={styles.stepKicker}>STEP 1 OF 2</Text>
          <Text style={styles.stepTitle}>Name your conglomerate</Text>
          <Text style={styles.fieldLabel}>CONGLOMERATE NAME</Text>
          <TextInput
            value={congName}
            onChangeText={setCongName}
            placeholder="e.g. Zenith Global Holdings"
            placeholderTextColor={colors.muted}
            style={[styles.input, congName.length >= 2 && styles.inputValid]}
            maxLength={32}
          />
          <Card accentColor={colors.warning} style={styles.statsCard}>
            <Text style={styles.cardKicker}>YOUR STARTING POSITION</Text>
            <View style={styles.statsGrid}>
              <StatBox label="SEED CAPITAL" value={formatMoneyCompact(config.startingCashMinor)} valueColor={colors.primary} />
              <StatBox label="COMPANY SLOTS" value={`${config.companyLimits[0]?.maxCompanies ?? 2}`} />
              <StatBox label="STARTING RANK" value="RANK 1" valueColor={colors.muted} />
              <StatBox label="HOLDING COST" value={formatMoneyCompact(config.holdingCompanyCostMinor)} />
            </View>
          </Card>
          <PrimaryButton label="CONTINUE →" onPress={() => setStep(2)} disabled={congName.trim().length < 2} />
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepBlock}>
          <Text style={styles.stepKicker}>STEP 2 OF 2</Text>
          <Text style={styles.stepTitle}>Choose a sector and give your company a name</Text>
          <Text style={styles.fieldLabel}>COMPANY NAME</Text>
          <TextInput
            value={compName}
            onChangeText={setCompName}
            placeholder="e.g. Apex Dynamics"
            placeholderTextColor={colors.muted}
            style={[styles.input, compName.length >= 2 && styles.inputValid]}
            maxLength={28}
          />
          <Text style={styles.fieldLabel}>SELECT INDUSTRY</Text>
          <View style={styles.sectorGrid}>
            {industries.map((industry) => (
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
              <Text style={styles.focusKicker}>BEST FOCUS</Text>
              <Text style={styles.focusHint}>{selectedPresentation.focusHint}</Text>
            </Card>
          ) : null}
          <PrimaryButton
            label={`LAUNCH ${compName ? compName.toUpperCase() : 'COMPANY'} →`}
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
