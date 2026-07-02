import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useGame } from '@/context/GameContext';
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
import { DisplayCurrencyCode } from '@/domain/money/MoneyFormatter';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';
import { getApiBaseUrl } from '@/config/backendConfig';

function formatSyncTime(unix: number | null): string {
  if (!unix) {
    return 'Never';
  }
  return new Date(unix * 1000).toLocaleString();
}

export default function ExecScreen() {
  const {
    dashboard,
    companies,
    config,
    backendStatus,
    activeLoans,
    borrowLoan,
    repayLoanById,
    saveNow,
    syncCloudNow,
    requestAccountDeletion,
    displayCurrency,
    setDisplayCurrency,
    formatMoneyCompact,
  } = useGame();
  const { busy, run } = useActionFeedback();

  const apiBaseUrl = getApiBaseUrl();
  const rank = dashboard.businessRank;
  const annualRate = effectiveAnnualInterestRate(rank);
  const currencyOptions: DisplayCurrencyCode[] = ['USD', 'EUR', 'SEK'];

  return (
    <Screen>
      <Card accentColor={colors.primary} style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {dashboard.conglomerateName.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {dashboard.conglomerateName || 'Your Empire'}
        </Text>
        <Text style={styles.sub}>CONGLOMERATE · RANK {rank}</Text>
        <View style={styles.stats}>
          <StatBox
            label="CASH"
            value={formatMoneyCompact(dashboard.playerCash.amountMinorUnits)}
            valueColor={colors.warning}
            small
          />
          <StatBox label="COMPANIES" value={String(dashboard.subsidiaryCount)} valueColor={colors.primary} small />
          <StatBox label="LOAN RATE" value={formatAnnualRatePercent(annualRate)} valueColor={colors.warning} small />
        </View>
      </Card>

      <SectionHeader title="Backend" subtitle="Account, cloud save and API status" />
      <View style={styles.backendCard}>
        <View style={styles.backendRow}>
          <Text style={styles.settingLabel}>API</Text>
          <Text style={styles.backendValue} numberOfLines={1}>
            {apiBaseUrl ?? 'Disabled (requires HTTPS in production)'}
          </Text>
        </View>
        <View style={styles.backendRow}>
          <Text style={styles.settingLabel}>Status</Text>
          <Text style={[styles.backendValue, backendStatus.connected ? styles.statusOk : styles.statusWarn]}>
            {backendStatus.enabled
              ? backendStatus.connected
                ? 'Connected'
                : 'Offline'
              : 'Local only'}
          </Text>
        </View>
        {backendStatus.playerId ? (
          <View style={styles.backendRow}>
            <Text style={styles.settingLabel}>Player ID</Text>
            <Text style={styles.backendMono} numberOfLines={1}>
              {backendStatus.playerId}
            </Text>
          </View>
        ) : null}
        <View style={styles.backendRow}>
          <Text style={styles.settingLabel}>Economy config</Text>
          <Text style={styles.backendValue}>{backendStatus.economyConfigSource}</Text>
        </View>
        {backendStatus.cloudSaveEnabled ? (
          <View style={styles.backendRow}>
            <Text style={styles.settingLabel}>Last cloud sync</Text>
            <Text style={styles.backendValue}>{formatSyncTime(backendStatus.lastSyncAtUnix)}</Text>
          </View>
        ) : null}
        {backendStatus.lastError ? <Text style={styles.backendError}>{backendStatus.lastError}</Text> : null}
        {backendStatus.welcomeTitle ? <Text style={styles.welcomeBanner}>{backendStatus.welcomeTitle}</Text> : null}
        {backendStatus.cloudSaveEnabled && backendStatus.connected ? (
          <PrimaryButton
            label={busy ? 'SYNCING…' : 'SYNC CLOUD SAVE'}
            onPress={() => run(syncCloudNow, 'Cloud sync')}
            disabled={busy}
          />
        ) : null}
        {backendStatus.connected ? (
          <Pressable
            onPress={() => run(requestAccountDeletion, 'Account deletion')}
            style={styles.deleteRow}
            disabled={busy}>
            <Text style={styles.deleteLabel}>Request account deletion</Text>
          </Pressable>
        ) : null}
      </View>

      <SectionHeader
        title="Finance"
        subtitle={`Borrow at ${formatAnnualRatePercent(annualRate)} APR — lower rates at higher rank`}
      />
      {activeLoans.length === 0 ? (
        <EmptyState title="No active loans" message="Interest accrues hourly on outstanding balance." />
      ) : (
        activeLoans.map((loan) => {
          const hourlyPercent = (loan.interestRateHourly * 8760 * 100).toFixed(1);
          return (
            <View key={loan.id} style={styles.loanRow}>
              <View>
                <Text style={styles.loanTitle}>{loan.productId}</Text>
                <Text style={styles.loanMeta}>
                  Remaining {formatMoneyCompact(loan.remainingMinor)} · {hourlyPercent}% APR locked
                </Text>
              </View>
              <Pressable onPress={() => repayLoanById(loan.id)} style={styles.repayButton}>
                <Text style={styles.repayLabel}>REPAY</Text>
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
                <Text style={styles.loanTitle}>{product.displayName}</Text>
                <Text style={styles.loanMeta}>
                  Up to {formatMoneyCompact(terms.maxAmountMinor)} · {formatAnnualRatePercent(terms.annualRate)} APR
                </Text>
                <PrimaryButton
                  label={`BORROW ${formatMoneyCompact(terms.maxAmountMinor)}`}
                  onPress={() => borrowLoan(product.id, terms.maxAmountMinor)}
                />
              </View>
            );
          })
        : null}

      <SectionHeader title="Display currency" subtitle="Display only — simulation stays in USD minor units" />
      <View style={styles.currencyRow}>
        {currencyOptions.map((code) => {
          const selected = displayCurrency === code;
          return (
            <Pressable
              key={code}
              onPress={() => setDisplayCurrency(code)}
              style={[styles.currencyChip, selected && styles.currencyChipSelected]}>
              <Text style={[styles.currencyLabel, selected && styles.currencyLabelSelected]}>{code}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Tip" subtitle="Company leadership" />
      <Text style={styles.tipText}>
        Hire CEO, CFO, COO and other executives inside each company from HQ — not here. Executives automate tasks and
        improve performance per subsidiary.
      </Text>

      <SectionHeader title="Local save" subtitle="Manual persistence" />
      <Pressable onPress={() => saveNow()} style={styles.settingRow}>
        <View>
          <Text style={styles.settingLabel}>Save now</Text>
          <Text style={styles.settingHint}>Writes local save and syncs cloud when connected</Text>
        </View>
      </Pressable>
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
  backendMono: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.muted,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  statusOk: { color: colors.success },
  statusWarn: { color: colors.warning },
  backendError: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.danger },
  welcomeBanner: { fontFamily: fonts.body, fontSize: fontSizes.sm, color: colors.primary },
  deleteRow: { paddingVertical: spacing.xs, alignItems: 'center' },
  deleteLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.danger,
    textDecorationLine: 'underline',
  },
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
  },
  settingLabel: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.lg, color: colors.text },
  settingHint: { fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, marginTop: 4 },
  currencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  currencyChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  currencyChipSelected: {
    borderColor: `${colors.primary}60`,
    backgroundColor: `${colors.primary}14`,
  },
  currencyLabel: {
    fontFamily: fonts.display,
    fontSize: fontSizes.sm,
    color: colors.muted,
    fontWeight: '700',
  },
  currencyLabelSelected: {
    color: colors.primary,
  },
});
