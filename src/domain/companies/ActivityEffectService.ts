import { ActivityDefinition, ActivityEffectType } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';
import { MoneyValue } from '@/domain/money/MoneyValue';

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

export function pruneExpiredEffects(company: CompanyState, nowUnix: number): void {
  company.activeEffects = (company.activeEffects ?? []).filter(
    (effect) => effect.expiresAtUnix > nowUnix,
  );
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

export function applyActivityEffect(
  company: CompanyState,
  activity: ActivityDefinition,
  nowUnix: number,
  random: () => number = Math.random,
): ActivityApplyResult {
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
  if (activity.rewardMinor > 0) {
    instantCashMinor = activity.rewardMinor;
    company.cashBalance = company.cashBalance.add(MoneyValue.fromMinor(instantCashMinor));
  }

  let effectApplied = false;
  if (activity.effectType !== 'cash_reward' && activity.durationSeconds > 0) {
    pruneExpiredEffects(company, nowUnix);
    const nextEffect: CompanyActiveEffect = {
      activityId: activity.id,
      effectType: activity.effectType,
      multiplier: activity.effectMultiplier,
      expiresAtUnix: nowUnix + activity.durationSeconds,
    };
    const existingIndex = company.activeEffects.findIndex(
      (effect) => effect.activityId === activity.id,
    );
    if (existingIndex >= 0) {
      company.activeEffects[existingIndex] = nextEffect;
    } else {
      company.activeEffects.push(nextEffect);
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
  const hours = Math.max(1, Math.round(activity.durationSeconds / 3600));
  const pct = Math.round((activity.effectMultiplier - 1) * 100);
  if (activity.effectType === 'temporary_revenue_multiplier') {
    return pct >= 0 ? `+${pct}% rev · ${hours}h` : `${pct}% rev · ${hours}h`;
  }
  if (activity.effectType === 'temporary_expense_multiplier') {
    return pct >= 0 ? `+${pct}% exp · ${hours}h` : `${pct}% exp · ${hours}h`;
  }
  return null;
}
