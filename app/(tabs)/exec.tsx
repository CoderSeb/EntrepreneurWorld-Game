import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useGame } from '@/context/GameContext';
import { interpolate, LOCALE_CATALOG, useTranslation } from '@/i18n';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { StatBox } from '@/components/StatBox';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { useActionFeedback } from '@/hooks/useActionFeedback';
import {
  effectiveAnnualInterestRate,
  effectiveLoanTerms,
  formatAnnualRatePercent,
} from '@/domain/companies/LoanPricingService';
import { getLoanProductLabel } from '@/i18n/configLabels';
import { DisplayCurrencyCode } from '@/domain/money/MoneyFormatter';
import { SupportedLocale } from '@/i18n/locales';
import { cloudSyncStatusLabel } from '@/services/backend/CloudSyncPresentation';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { TreasuryPanel } from '@/components/TreasuryPanel';

function formatSyncTime(unix: number | null, neverLabel: string): string {
  if (!unix) {
    return neverLabel;
  }
  return new Date(unix * 1000).toLocaleString();
}

export default function ExecScreen() {
  const {
    dashboard,
    config,
    backendStatus,
    cloudSync,
    activeLoans,
    borrowLoan,
    repayLoanById,
    saveNow,
    syncCloudNow,
    deleteAccount,
    lastSaveError,
    displayCurrency,
    setDisplayCurrency,
    locale,
    setLocale,
    formatMoneyCompact,
  } = useGame();
  const { t } = useTranslation();
  const { busy, run } = useActionFeedback();
  const [deletingAccount, setDeletingAccount] = useState(false);

  const rank = dashboard.businessRank;
  const annualRate = effectiveAnnualInterestRate(rank);
  const currencyOptions: DisplayCurrencyCode[] = ['USD', 'EUR', 'SEK'];

  const cloudStatusLabel = cloudSyncStatusLabel(cloudSync.status, {
    synced: t.exec.cloudSyncSynced,
    pending: t.exec.cloudSyncPending,
    syncing: t.exec.cloudSyncSyncing,
    offline: t.exec.cloudSyncOffline,
    unavailable: t.exec.cloudSyncUnavailable,
    disabled: t.exec.cloudSyncDisabled,
    error: t.exec.cloudSyncError,
  });

  const statusStyle =
    cloudSync.status === 'synced'
      ? styles.statusOk
      : cloudSync.status === 'syncing'
        ? styles.statusNeutral
        : cloudSync.status === 'pending'
          ? styles.statusWarn
          : cloudSync.status === 'offline' || cloudSync.status === 'disabled'
            ? styles.statusMuted
            : styles.statusWarn;

  const confirmDeleteAccount = () => {
    if (!backendStatus.connected || deletingAccount) {
      return;
    }

    Alert.alert(t.exec.deleteAccountConfirmTitle, t.exec.deleteAccountConfirmMessage, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.exec.deleteAccountConfirmAction,
        style: 'destructive',
        onPress: () => {
          setDeletingAccount(true);
          deleteAccount()
            .then((result) => {
              if (result.success) {
                router.replace('/onboarding');
                return;
              }
              Alert.alert(t.exec.deleteAccountFailedTitle, result.message);
            })
            .finally(() => setDeletingAccount(false));
        },
      },
    ]);
  };

  return (
    <Screen>
      <Card accentColor={colors.primary} style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {dashboard.conglomerateName.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {dashboard.conglomerateName || t.common.yourEmpire}
        </Text>
        <Text style={styles.sub}>{interpolate(t.exec.conglomerateRank, { rank })}</Text>
        <View style={styles.stats}>
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
          <StatBox label={t.exec.loanRate} value={formatAnnualRatePercent(annualRate)} valueColor={colors.warning} small />
        </View>
      </Card>

      <TreasuryPanel />

      <SectionHeader title={t.exec.cloudSyncTitle} subtitle={t.exec.cloudSyncSubtitle} />
      <View style={styles.backendCard}>
        <View style={styles.backendRow}>
          <Text style={styles.settingLabel}>{t.exec.cloudSyncStatus}</Text>
          <Text style={[styles.backendValue, statusStyle]}>{cloudStatusLabel}</Text>
        </View>
        {cloudSync.status !== 'disabled' && cloudSync.status !== 'unavailable' ? (
          <View style={styles.backendRow}>
            <Text style={styles.settingLabel}>{t.exec.cloudSyncLastSynced}</Text>
            <Text style={styles.backendValue}>
              {formatSyncTime(cloudSync.lastSyncAtUnix, t.common.never)}
            </Text>
          </View>
        ) : null}
        {cloudSync.statusMessage ? <Text style={styles.backendError}>{cloudSync.statusMessage}</Text> : null}
        {cloudSync.status === 'offline' ? (
          <Text style={styles.backendHint}>{t.exec.cloudSyncHintOffline}</Text>
        ) : null}
        {backendStatus.welcomeTitle ? <Text style={styles.welcomeBanner}>{backendStatus.welcomeTitle}</Text> : null}
        {cloudSync.canSyncNow ? (
          <PrimaryButton
            label={busy || cloudSync.status === 'syncing' ? t.common.syncing : t.exec.cloudSyncSyncNow}
            onPress={() =>
              run(syncCloudNow, t.exec.cloudSyncSyncNow, {
                complete: interpolate(t.common.actionComplete, { title: t.exec.cloudSyncSyncNow }),
                failed: interpolate(t.common.actionFailed, { title: t.exec.cloudSyncSyncNow }),
              })
            }
            disabled={busy || deletingAccount || cloudSync.status === 'syncing'}
          />
        ) : null}
      </View>

      <SectionHeader
        title={t.exec.financeTitle}
        subtitle={interpolate(t.exec.financeSubtitle, { rate: formatAnnualRatePercent(annualRate) })}
      />
      {activeLoans.length === 0 ? (
        <EmptyState title={t.exec.noLoansTitle} message={t.exec.noLoansMessage} />
      ) : (
        activeLoans.map((loan) => {
          const hourlyPercent = (loan.interestRateHourly * 8760 * 100).toFixed(1);
          return (
            <View key={loan.id} style={styles.loanRow}>
              <View>
                <Text style={styles.loanTitle}>{loan.productId}</Text>
                <Text style={styles.loanMeta}>
                  {interpolate(t.exec.loanRemaining, {
                    amount: formatMoneyCompact(loan.remainingMinor),
                    rate: hourlyPercent,
                  })}
                </Text>
              </View>
              <Pressable onPress={() => repayLoanById(loan.id)} style={styles.repayButton}>
                <Text style={styles.repayLabel}>{t.common.repay}</Text>
              </Pressable>
            </View>
          );
        })
      )}

      {activeLoans.length < config.maxActiveLoans
        ? config.loanProducts.map((product) => {
            const terms = effectiveLoanTerms(product, rank);
            return (
              <View key={product.id} style={styles.loanOffer}>
                <Text style={styles.loanTitle}>{getLoanProductLabel(product.id, t)}</Text>
                <Text style={styles.loanMeta}>
                  {interpolate(t.exec.loanOfferMeta, {
                    amount: formatMoneyCompact(terms.maxAmountMinor),
                    rate: formatAnnualRatePercent(terms.annualRate),
                  })}
                </Text>
                <PrimaryButton
                  label={interpolate(t.exec.borrowAmount, { amount: formatMoneyCompact(terms.maxAmountMinor) })}
                  onPress={() => borrowLoan(product.id, terms.maxAmountMinor)}
                />
              </View>
            );
          })
        : null}

      <SectionHeader title={t.exec.displayCurrencyTitle} subtitle={t.exec.displayCurrencySubtitle} />
      <View style={styles.optionRow}>
        {currencyOptions.map((code) => {
          const selected = displayCurrency === code;
          return (
            <Pressable
              key={code}
              onPress={() => setDisplayCurrency(code)}
              style={[styles.optionChip, selected && styles.optionChipSelected]}>
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{code}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title={t.exec.languageTitle} subtitle={t.exec.languageSubtitle} />
      <View style={styles.optionRow}>
        {LOCALE_CATALOG.map((entry) => {
          const selected = locale === entry.code;
          return (
            <Pressable
              key={entry.code}
              onPress={() => setLocale(entry.code as SupportedLocale)}
              style={[styles.optionChip, selected && styles.optionChipSelected]}>
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{entry.nativeName}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title={t.exec.tipTitle} subtitle={t.exec.tipSubtitle} />
      <Text style={styles.tipText}>{t.exec.tipBody}</Text>

      <SectionHeader title={t.exec.localSaveTitle} subtitle={t.exec.localSaveSubtitle} />
      {lastSaveError ? <Text style={styles.backendError}>{t.exec.saveFailed}</Text> : null}
      <Pressable onPress={() => saveNow()} style={styles.settingRow}>
        <View>
          <Text style={styles.settingLabel}>{t.common.saveNow}</Text>
          <Text style={styles.settingHint}>{t.exec.saveHint}</Text>
        </View>
      </Pressable>

      {backendStatus.connected ? (
        <>
          <SectionHeader title={t.exec.deleteAccountTitle} subtitle={t.exec.deleteAccountSubtitle} />
          <Pressable
            onPress={confirmDeleteAccount}
            style={[styles.dangerCard, deletingAccount && styles.dangerCardDisabled]}
            disabled={deletingAccount}>
            <Text style={styles.dangerTitle}>
              {deletingAccount ? t.common.deleting : t.exec.deleteAccountConfirmAction}
            </Text>
            <Text style={styles.dangerHint}>{t.exec.deleteAccountSubtitle}</Text>
          </Pressable>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarLetter: { fontFamily: fonts.display, fontSize: 22, color: colors.primary, fontWeight: '900' },
  name: {
    fontFamily: fonts.display,
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 4 },
  stats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, justifyContent: 'center' },
  backendCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.primary}15`,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  backendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backendValue: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  statusOk: { color: colors.success },
  statusWarn: { color: colors.warning },
  statusMuted: { color: colors.muted },
  statusNeutral: { color: colors.primary },
  backendError: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.danger },
  backendHint: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, lineHeight: 16 },
  welcomeBanner: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.primary },
  loanRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.warning}20`,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loanOffer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.warning}15`,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
  },
  loanTitle: { fontFamily: fonts.display, fontSize: fontSizes.md, color: colors.text },
  loanMeta: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 2 },
  repayButton: {
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  repayLabel: { fontFamily: fonts.display, fontSize: fontSizes.xs, color: colors.danger },
  tipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  settingRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.primary}0a`,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  settingLabel: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.lg, color: colors.text },
  settingHint: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 4 },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  optionChipSelected: {
    borderColor: `${colors.primary}60`,
    backgroundColor: `${colors.primary}14`,
  },
  optionLabel: {
    fontFamily: fonts.display,
    fontSize: fontSizes.sm,
    color: colors.muted,
    fontWeight: '700',
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  dangerCard: {
    backgroundColor: `${colors.danger}10`,
    borderWidth: 1,
    borderColor: `${colors.danger}40`,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  dangerCardDisabled: {
    opacity: 0.6,
  },
  dangerTitle: {
    fontFamily: fonts.display,
    fontSize: fontSizes.md,
    color: colors.danger,
    fontWeight: '800',
    textAlign: 'center',
  },
  dangerHint: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
