import { ActivityDefinition, ActivityEffectType } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { formatDurationSeconds } from '@/domain/time/DurationFormat';

export type CompanyActiveEffect = {
  activityId: string;
  effectType: ActivityEffectType;
  multiplier: number;
  expiresAtUnix: number;
};

export type ActivityApplyResult = {
  success: boolean;
  failed: boolean;
  instantCashMinor: number;
  effectApplied: boolean;
};

export type ActivityApplyOptions = {
  instantCashMinor?: number;
  random?: () => number;
};

export function pruneExpiredEffects(company: CompanyState, nowUnix: number): void {
  company.activeEffects = (company.activeEffects ?? []).filter(
    (effect) => effect.expiresAtUnix > nowUnix,
  );
}

export function getActivityBoostRemaining(
  company: CompanyState,
  activityId: string,
  nowUnix: number,
): number {
  pruneExpiredEffects(company, nowUnix);
  const activeEffects = company.activeEffects.filter((entry) => entry.activityId === activityId);
  if (activeEffects.length === 0) {
    return 0;
  }
  const latestExpiry = Math.max(...activeEffects.map((effect) => effect.expiresAtUnix));
  return Math.max(0, latestExpiry - nowUnix);
}

export function hasActiveActivityBoost(
  company: CompanyState,
  activityId: string,
  nowUnix: number,
): boolean {
  return getActivityBoostRemaining(company, activityId, nowUnix) > 0;
}

export function getActivityRevenueMultiplier(company: CompanyState, nowUnix: number): number {
  pruneExpiredEffects(company, nowUnix);
  let multiplier = 1;
  for (const effect of company.activeEffects) {
    if (effect.effectType === 'temporary_revenue_multiplier') {
      multiplier *= effect.multiplier;
    }
  }
  return multiplier;
}

export function getActivityExpenseMultiplier(company: CompanyState, nowUnix: number): number {
  pruneExpiredEffects(company, nowUnix);
  let multiplier = 1;
  for (const effect of company.activeEffects) {
    if (effect.effectType === 'temporary_expense_multiplier') {
      multiplier *= effect.multiplier;
    }
  }
  return multiplier;
}

function formatMultiplierEffect(effectType: ActivityEffectType, multiplier: number): string | null {
  const pct = Math.round((multiplier - 1) * 100);
  if (effectType === 'temporary_revenue_multiplier') {
    return `${pct >= 0 ? '+' : ''}${pct}% rev`;
  }
  if (effectType === 'temporary_expense_multiplier') {
    return `${pct >= 0 ? '+' : ''}${pct}% exp`;
  }
  return null;
}

export function applyActivityEffect(
  company: CompanyState,
  activity: ActivityDefinition,
  nowUnix: number,
  options: ActivityApplyOptions = {},
): ActivityApplyResult {
  const random = options.random ?? Math.random;

  if (activity.failureChance > 0 && random() < activity.failureChance) {
    if (activity.failureReputationLoss > 0) {
      company.reputation = Math.max(0, company.reputation - activity.failureReputationLoss);
    }
    return {
      success: true,
      failed: true,
      instantCashMinor: 0,
      effectApplied: false,
    };
  }

  let instantCashMinor = 0;
  const cashToGrant =
    options.instantCashMinor
    ?? (activity.rewardMinor > 0 ? activity.rewardMinor : 0);
  if (cashToGrant > 0) {
    instantCashMinor = cashToGrant;
    company.cashBalance = company.cashBalance.add(MoneyValue.fromMinor(instantCashMinor));
  }

  let effectApplied = false;
  if (activity.effectType !== 'cash_reward' && activity.durationSeconds > 0) {
    pruneExpiredEffects(company, nowUnix);
    if (hasActiveActivityBoost(company, activity.id, nowUnix)) {
      return {
        success: true,
        failed: false,
        instantCashMinor,
        effectApplied: false,
      };
    }

    const expiresAtUnix = nowUnix + activity.durationSeconds;
    const effectDefinitions: Array<{ effectType: ActivityEffectType; multiplier: number }> = [
      { effectType: activity.effectType, multiplier: activity.effectMultiplier },
    ];
    if (
      activity.secondaryEffectType
      && activity.secondaryEffectMultiplier !== undefined
      && activity.secondaryEffectType !== 'cash_reward'
    ) {
      effectDefinitions.push({
        effectType: activity.secondaryEffectType,
        multiplier: activity.secondaryEffectMultiplier,
      });
    }

    for (const effectDefinition of effectDefinitions) {
      company.activeEffects.push({
        activityId: activity.id,
        effectType: effectDefinition.effectType,
        multiplier: effectDefinition.multiplier,
        expiresAtUnix,
      });
    }
    effectApplied = true;
  }

  company.updatedAtUnix = nowUnix;
  return {
    success: true,
    failed: false,
    instantCashMinor,
    effectApplied,
  };
}

export function describeActivityEffect(activity: ActivityDefinition): string | null {
  if (activity.effectType === 'cash_reward' && activity.rewardMinor > 0) {
    return `+${activity.rewardMinor}`;
  }
  if (activity.durationSeconds <= 0) {
    return null;
  }

  const parts: string[] = [];
  const primary = formatMultiplierEffect(activity.effectType, activity.effectMultiplier);
  if (primary) {
    parts.push(primary);
  }
  if (
    activity.secondaryEffectType
    && activity.secondaryEffectMultiplier !== undefined
  ) {
    const secondary = formatMultiplierEffect(
      activity.secondaryEffectType,
      activity.secondaryEffectMultiplier,
    );
    if (secondary) {
      parts.push(secondary);
    }
  }
  parts.push(formatDurationSeconds(activity.durationSeconds));
  return parts.join(' · ');
}
