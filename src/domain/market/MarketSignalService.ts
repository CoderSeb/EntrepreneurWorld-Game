import { EconomyConfig, getMarketEvent, MarketSignalDefinition } from '@/domain/config/EconomyConfig';
import { AppState, MarketEventPayload, MarketSignalPayload } from '@/domain/core/AppState';

const ACTIVE_SIGNALS_KEY = 'market_signals';

export function refreshMarketSignalsAndEvents(
  appState: AppState,
  config: EconomyConfig,
  nowUnix: number,
): void {
  let activeEvents = pruneExpiredEvents(appState.marketState.active_events ?? [], nowUnix);
  let activeSignals = pruneExpiredSignals(appState.marketState.market_signals ?? [], nowUnix);

  const dueSignals = activeSignals.filter((signal) => signal.event_starts_at_unix <= nowUnix);
  if (dueSignals.length > 0) {
    for (const signal of dueSignals) {
      const eventDef = getMarketEvent(config, signal.predicted_event_id);
      if (eventDef) {
        activeEvents = [...activeEvents, toActiveEventPayload(eventDef, nowUnix)];
      }
    }
    activeSignals = activeSignals.filter((signal) => signal.event_starts_at_unix > nowUnix);
  }

  if (activeEvents.length === 0 && activeSignals.length === 0 && config.marketEvents.length > 0) {
    if (config.marketSignals.length > 0 && Math.random() < 0.65) {
      const signalDef = pickRandomSignal(config.marketSignals);
      if (signalDef) {
        activeSignals = [...activeSignals, toActiveSignalPayload(signalDef, config, nowUnix)];
      }
    } else {
      const eventDef = pickRandomEvent(config.marketEvents);
      if (eventDef) {
        activeEvents = [...activeEvents, toActiveEventPayload(eventDef, nowUnix)];
      }
    }
  }

  appState.marketState = {
    ...appState.marketState,
    active_events: activeEvents,
    [ACTIVE_SIGNALS_KEY]: activeSignals,
  };
}

export function getActiveMarketSignals(appState: AppState): MarketSignalPayload[] {
  return appState.marketState.market_signals ?? [];
}

function pruneExpiredEvents(activeEvents: MarketEventPayload[], nowUnix: number): MarketEventPayload[] {
  return activeEvents.filter((event) => (event.ends_at_unix ?? 0) > nowUnix);
}

function pruneExpiredSignals(signals: MarketSignalPayload[], nowUnix: number): MarketSignalPayload[] {
  return signals.filter((signal) => signal.visible_until_unix > nowUnix);
}

function pickRandomEvent(events: EconomyConfig['marketEvents']) {
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

function pickRandomSignal(signals: MarketSignalDefinition[]) {
  const totalWeight = signals.reduce((sum, signal) => sum + Math.max(1, signal.weight), 0);
  if (totalWeight <= 0) {
    return null;
  }
  let roll = Math.floor(Math.random() * totalWeight) + 1;
  for (const signal of signals) {
    roll -= Math.max(1, signal.weight);
    if (roll <= 0) {
      return signal;
    }
  }
  return signals[0] ?? null;
}

function toActiveEventPayload(
  eventDef: EconomyConfig['marketEvents'][number],
  nowUnix: number,
): MarketEventPayload {
  return {
    id: eventDef.id,
    display_name: eventDef.displayName,
    revenue_multiplier: eventDef.revenueMultiplier,
    expense_multiplier: eventDef.expenseMultiplier,
    affects_industry_ids: [...eventDef.affectsIndustryIds],
    started_at_unix: nowUnix,
    ends_at_unix: nowUnix + eventDef.durationHours * 3600,
  };
}

function toActiveSignalPayload(
  signalDef: MarketSignalDefinition,
  config: EconomyConfig,
  nowUnix: number,
): MarketSignalPayload {
  const predictedEventId = signalDef.predictedEventIds[0] ?? config.marketEvents[0]?.id ?? '';
  const eventDef = getMarketEvent(config, predictedEventId);
  const leadSeconds = signalDef.leadTimeHours * 3600;
  return {
    id: signalDef.id,
    display_name: signalDef.displayName,
    predicted_event_id: predictedEventId,
    affects_industry_ids: [...signalDef.affectsIndustryIds],
    visible_until_unix: nowUnix + leadSeconds,
    event_starts_at_unix: nowUnix + leadSeconds,
    expected_revenue_multiplier: eventDef?.revenueMultiplier ?? 1,
    expected_expense_multiplier: eventDef?.expenseMultiplier ?? 1,
  };
}
