import { LeaderboardEntryDto, LeaderboardResponse } from '@/services/api/types';

function readNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeLeaderboardEntry(raw: Record<string, unknown>): LeaderboardEntryDto {
  const conglomerateNetWorthMinor = readNumber(
    raw.conglomerateNetWorthMinor ?? raw.netWorthMinor,
  );

  return {
    rank: readNumber(raw.rank),
    playerId: String(raw.playerId ?? ''),
    displayName: String(raw.displayName ?? 'Player'),
    scoreMinor: readNumber(raw.scoreMinor, conglomerateNetWorthMinor),
    conglomerateNetWorthMinor,
    personalNetWorthMinor: readNumber(raw.personalNetWorthMinor),
    hourlyEarningsMinor: readNumber(raw.hourlyEarningsMinor),
    businessRank: readNumber(raw.businessRank),
    subsidiaryCount: readNumber(raw.subsidiaryCount),
    isCurrentPlayer: Boolean(raw.isCurrentPlayer),
  };
}

export function normalizeLeaderboardResponse(raw: Record<string, unknown>): LeaderboardResponse {
  const entries = Array.isArray(raw.entries)
    ? raw.entries.map((entry) => normalizeLeaderboardEntry(entry as Record<string, unknown>))
    : [];

  const currentPlayerRaw = raw.currentPlayer;
  const currentPlayer =
    currentPlayerRaw && typeof currentPlayerRaw === 'object'
      ? normalizeLeaderboardEntry(currentPlayerRaw as Record<string, unknown>)
      : null;

  return {
    board: String(raw.board ?? 'net_worth') as LeaderboardResponse['board'],
    generatedAt: String(raw.generatedAt ?? ''),
    entries,
    currentPlayer,
  };
}
