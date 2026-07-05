import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { AppState } from '@/domain/core/AppState';
import { refreshMarketSignalsAndEvents } from '@/domain/market/MarketSignalService';

export function refreshEvents(
  appState: AppState,
  config: EconomyConfig,
  nowUnix: number,
): void {
  refreshMarketSignalsAndEvents(appState, config, nowUnix);
}

export function getActiveEventSummaries(appState: AppState): string[] {
  return (appState.marketState.active_events ?? []).map(
    (event) => event.display_name || event.id || 'Event',
  );
}
