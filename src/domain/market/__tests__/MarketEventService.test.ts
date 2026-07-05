import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { createAppState } from '@/domain/core/AppState';
import { refreshEvents } from '@/domain/market/MarketEventService';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

describe('MarketEventService', () => {
  it('defaults global events without industry filters to all industries', () => {
    const globalEvent = config.marketEvents.find((event) => event.id === 'local_boom');
    expect(globalEvent?.affectsIndustryIds).toEqual([]);
  });

  it('can activate global market events without crashing', () => {
    const appState = createAppState();
    const originalRandom = Math.random;
    Math.random = () => 0.9;

    try {
      refreshEvents(appState, config, 1_700_000_000);
    } finally {
      Math.random = originalRandom;
    }

    const active = appState.marketState.active_events ?? [];
    expect(active.length).toBeGreaterThan(0);
    expect(Array.isArray(active[0]?.affects_industry_ids)).toBe(true);
  });
});
