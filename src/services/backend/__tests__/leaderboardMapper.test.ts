import {
  normalizeLeaderboardEntry,
  normalizeLeaderboardResponse,
} from '@/services/backend/leaderboardMapper';

describe('leaderboardMapper', () => {
  it('maps API scoreMinor for net worth board values', () => {
    const entry = normalizeLeaderboardEntry({
      rank: 1,
      playerId: 'player-1',
      displayName: 'Orbit Holdings',
      scoreMinor: 3_050_000,
      conglomerateNetWorthMinor: 3_050_000,
      personalNetWorthMinor: 120_000,
      hourlyEarningsMinor: 98_000,
      businessRank: 5,
      subsidiaryCount: 1,
      isCurrentPlayer: true,
    });

    expect(entry.scoreMinor).toBe(3_050_000);
    expect(entry.conglomerateNetWorthMinor).toBe(3_050_000);
  });

  it('falls back from legacy netWorthMinor field', () => {
    const entry = normalizeLeaderboardEntry({
      rank: 2,
      displayName: 'Legacy Corp',
      netWorthMinor: 1_500_000,
      businessRank: 3,
      subsidiaryCount: 2,
    });

    expect(entry.scoreMinor).toBe(1_500_000);
    expect(entry.conglomerateNetWorthMinor).toBe(1_500_000);
  });

  it('normalizes leaderboard response entries', () => {
    const response = normalizeLeaderboardResponse({
      board: 'net_worth',
      generatedAt: '2026-07-05T12:00:00Z',
      entries: [
        {
          rank: 1,
          displayName: 'Alpha',
          scoreMinor: 2_000_000,
          conglomerateNetWorthMinor: 2_000_000,
          businessRank: 4,
          subsidiaryCount: 1,
        },
      ],
      currentPlayer: null,
    });

    expect(response.entries).toHaveLength(1);
    expect(response.entries[0]?.scoreMinor).toBe(2_000_000);
  });
});
