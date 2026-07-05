import type { TranslationDictionary } from '@/i18n/types';

function fallbackLabel(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getExecutiveTitle(roleId: string, t: TranslationDictionary): string {
  const executives = t.configLabels.executives as Record<string, { title: string; description: string }>;
  return executives[roleId]?.title ?? fallbackLabel(roleId);
}

export function getExecutiveDescription(roleId: string, t: TranslationDictionary): string {
  const executives = t.configLabels.executives as Record<string, { title: string; description: string }>;
  return executives[roleId]?.description ?? '';
}

export function getTrackLabel(trackId: string, t: TranslationDictionary): string {
  const tracks = t.configLabels.tracks as Record<string, string>;
  return tracks[trackId] ?? fallbackLabel(trackId);
}

export function getActivityLabel(activityId: string, t: TranslationDictionary): string {
  const activities = t.configLabels.activities as Record<string, string>;
  return activities[activityId] ?? fallbackLabel(activityId);
}

export function getMarketEventLabel(eventId: string, t: TranslationDictionary): string {
  const events = t.configLabels.marketEvents as Record<string, string>;
  return events[eventId] ?? fallbackLabel(eventId);
}

export function getMarketSignalLabel(signalId: string, t: TranslationDictionary): string {
  const signals = t.configLabels.marketSignals as Record<string, string>;
  return signals[signalId] ?? fallbackLabel(signalId);
}

export function getLoanProductLabel(productId: string, t: TranslationDictionary): string {
  const loans = t.configLabels.loans as Record<string, string>;
  return loans[productId] ?? fallbackLabel(productId);
}
