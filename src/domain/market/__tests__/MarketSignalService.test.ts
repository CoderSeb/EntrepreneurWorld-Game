import { createAppState } from '@/domain/core/AppState';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { refreshMarketSignalsAndEvents } from '@/domain/market/MarketSignalService';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

describe('MarketSignalService', () => {
  it('promotes due signals into active events', () => {
    const state = createAppState();
    const nowUnix = 1_700_000_000;
    state.marketState = {
      market_signals: [
        {
          id: 'energy_warning',
          display_name: 'Energy prices rising',
          predicted_event_id: 'energy_price_spike',
          affects_industry_ids: ['cafe'],
          visible_until_unix: nowUnix + 3600,
          event_starts_at_unix: nowUnix,
          expected_revenue_multiplier: 1,
          expected_expense_multiplier: 1.12,
        },
      ],
      active_events: [],
    };

    refreshMarketSignalsAndEvents(state, config, nowUnix);

    expect(state.marketState.active_events?.length).toBe(1);
    expect(state.marketState.active_events?.[0].id).toBe('energy_price_spike');
    expect(state.marketState.market_signals?.length).toBe(0);
  });
});
