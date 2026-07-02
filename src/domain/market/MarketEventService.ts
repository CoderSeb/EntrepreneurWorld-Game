import { EconomyConfig, MarketEventDefinition } from '@/domain/config/EconomyConfig';
import { AppState, MarketEventPayload } from '@/domain/core/AppState';

const ACTIVE_EVENTS_KEY = 'active_events';

export function refreshEvents(
  appState: AppState,
  config: EconomyConfig,
  nowUnix: number,
): void {
  let activeEvents = pruneExpired(appState.marketState.active_events ?? [], nowUnix);

  if (activeEvents.length === 0 && config.marketEvents.length > 0) {
    const picked = pickRandomEvent(config.marketEvents);
    if (picked) {
      activeEvents = [...activeEvents, toActivePayload(picked, nowUnix)];
    }
  }

  appState.marketState = {
    ...appState.marketState,
    [ACTIVE_EVENTS_KEY]: activeEvents,
  };
}

export function getActiveEventSummaries(appState: AppState): string[] {
  return (appState.marketState.active_events ?? []).map(
    (event) => event.display_name || event.id || 'Event',
  );
}

function pruneExpired(activeEvents: MarketEventPayload[], nowUnix: number): MarketEventPayload[] {
  return activeEvents.filter((event) => (event.ends_at_unix ?? 0) > nowUnix);
}

function pickRandomEvent(events: MarketEventDefinition[]): MarketEventDefinition | null {
  const totalWeight = events.reduce((sum, event) => sum + Math.max(1, event.weight), 0);
  if (totalWeight <= 0) {
    return null;
  }

  let roll = Math.floor(Math.random() * totalWeight) + 1;
  for (const event of events) {
    roll -= Math.max(1, event.weight);
    if (roll <= 0) {
      return event;
    }
  }
  return events[0] ?? null;
}

function toActivePayload(
  eventDef: MarketEventDefinition,
  nowUnix: number,
): MarketEventPayload {
  return {
    id: eventDef.id,
    display_name: eventDef.displayName,
    revenue_multiplier: eventDef.revenueMultiplier,
    expense_multiplier: eventDef.expenseMultiplier,
    affects_industry_ids: [...(eventDef.affectsIndustryIds ?? [])],
    started_at_unix: nowUnix,
    ends_at_unix: nowUnix + eventDef.durationHours * 3600,
  };
}
