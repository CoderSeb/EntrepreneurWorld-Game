import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useGameBackend, useGameFormat } from '@/context/GameContext';
import { interpolate, useTranslation } from '@/i18n';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { fetchLeaderboard } from '@/services/backend/leaderboardService';
import { loadAuthSession } from '@/services/auth/authSessionStore';
import { LeaderboardBoard, LeaderboardEntryDto, LeaderboardResponse } from '@/services/api/types';
import { colors, spacing } from '@/theme/tokens';
import { fonts, fontSizes } from '@/theme/typography';

const BOARDS: LeaderboardBoard[] = ['net_worth', 'business_rank', 'subsidiaries'];

function formatBoardValue(
  board: LeaderboardBoard,
  entry: LeaderboardEntryDto,
  formatMoneyCompact: (minor: number) => string,
): string {
  switch (board) {
    case 'business_rank':
      return `${entry.businessRank}`;
    case 'subsidiaries':
      return String(entry.subsidiaryCount);
    default:
      return formatMoneyCompact(entry.scoreMinor);
  }
}

function boardLabel(board: LeaderboardBoard, t: ReturnType<typeof useTranslation>['t']): string {
  switch (board) {
    case 'business_rank':
      return t.leaderboard.boardRank;
    case 'subsidiaries':
      return t.leaderboard.boardCompanies;
    default:
      return t.leaderboard.boardNetWorth;
  }
}

export function LeaderboardSection() {
  const { backendStatus } = useGameBackend();
  const { formatMoneyCompact } = useGameFormat();
  const { t } = useTranslation();
  const [board, setBoard] = useState<LeaderboardBoard>('net_worth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LeaderboardResponse | null>(null);

  const loadLeaderboard = useCallback(async () => {
    if (!backendStatus.enabled) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await loadAuthSession();
      const result = await fetchLeaderboard(board, session?.accessToken ?? null);
      if (!result.success) {
        setData(null);
        setError(result.error.message);
        return;
      }
      setData(result.data);
    } catch {
      setData(null);
      setError(t.leaderboard.errorTitle);
    } finally {
      setLoading(false);
    }
  }, [backendStatus.enabled, board]);

  useEffect(() => {
    loadLeaderboard().catch(() => undefined);
  }, [loadLeaderboard]);

  return (
    <View style={styles.container}>
      <SectionHeader title={t.leaderboard.title} subtitle={t.leaderboard.subtitle} />
      {!backendStatus.enabled ? (
        <EmptyState title={t.leaderboard.offlineTitle} message={t.leaderboard.offlineMessage} />
      ) : (
        <>
          <View style={styles.boardRow}>
            {BOARDS.map((option) => {
              const selected = board === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setBoard(option)}
                  style={[styles.boardChip, selected && styles.boardChipSelected]}>
                  <Text style={[styles.boardLabel, selected && styles.boardLabelSelected]}>
                    {boardLabel(option, t)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>{t.leaderboard.loading}</Text>
            </View>
          ) : error ? (
            <EmptyState title={t.leaderboard.errorTitle} message={error} />
          ) : !data || data.entries.length === 0 ? (
            <EmptyState title={t.leaderboard.emptyTitle} message={t.leaderboard.emptyMessage} />
          ) : (
            <>
              {data.currentPlayer &&
              !data.entries.some((entry) => entry.isCurrentPlayer) ? (
                <View style={[styles.row, styles.currentPlayerRow]}>
                  <Text style={styles.rank}>#{data.currentPlayer.rank}</Text>
                  <View style={styles.rowBody}>
                    <Text style={styles.name}>{data.currentPlayer.displayName}</Text>
                    <Text style={styles.meta}>{t.leaderboard.yourRank}</Text>
                  </View>
                  <Text style={styles.value}>
                    {formatBoardValue(board, data.currentPlayer, formatMoneyCompact)}
                  </Text>
                </View>
              ) : null}

              {data.entries.map((entry) => (
                <View
                  key={entry.playerId}
                  style={[styles.row, entry.isCurrentPlayer && styles.currentPlayerRow]}>
                  <Text style={[styles.rank, entry.rank <= 3 && styles.rankTop]}>#{entry.rank}</Text>
                  <View style={styles.rowBody}>
                    <Text style={styles.name} numberOfLines={1}>
                      {entry.displayName}
                    </Text>
                    <Text style={styles.meta}>
                      {interpolate(t.leaderboard.entryMeta, {
                        rank: entry.businessRank,
                        companies: entry.subsidiaryCount,
                      })}
                    </Text>
                  </View>
                  <Text style={styles.value}>{formatBoardValue(board, entry, formatMoneyCompact)}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  boardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  boardChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  boardChipSelected: {
    borderColor: `${colors.primary}60`,
    backgroundColor: `${colors.primary}14`,
  },
  boardLabel: {
    fontFamily: fonts.display,
    fontSize: fontSizes.xs,
    color: colors.muted,
    fontWeight: '700',
    textAlign: 'center',
  },
  boardLabelSelected: {
    color: colors.primary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    color: colors.muted,
  },
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: `${colors.primary}10`,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  currentPlayerRow: {
    borderColor: `${colors.primary}50`,
    backgroundColor: `${colors.primary}10`,
  },
  rank: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    color: colors.muted,
    minWidth: 36,
    fontWeight: '700',
  },
  rankTop: {
    color: colors.warning,
  },
  rowBody: {
    flex: 1,
    flexShrink: 1,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: '700',
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '700',
  },
});
