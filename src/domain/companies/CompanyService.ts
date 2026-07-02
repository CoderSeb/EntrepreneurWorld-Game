import {
  EconomyConfig,
  getIndustry,
  getIndustryFoundingCost,
  ActivityDefinition,
} from '@/domain/config/EconomyConfig';
import { AppState, findCompany } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';
import { fail, ok, OperationResult } from '@/domain/core/OperationResult';
import { hasHolding } from '@/domain/core/PlayerState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { createHolding, createSubsidiary } from '@/domain/companies/CompanyFactory';
import {
  applyLevelUpgrade,
  getUpgradeCost as getLevelUpgradeCost,
} from '@/domain/economy/UpgradeCalculator';
import {
  applyRankIfImproved,
  getUnlockedIndustries,
  isIndustryUnlocked,
} from '@/domain/progression/ProgressionService';
import { getSubsidiaries } from '@/domain/core/AppState';
import { getMaxCompaniesForLevel } from '@/domain/config/EconomyConfig';

export function createHoldingCompany(
  appState: AppState,
  config: EconomyConfig,
  companyName: string,
  nowUnix: number,
): OperationResult<CompanyState> {
  if (hasHolding(appState.player)) {
    return fail('holding_exists', 'You already have a holding company');
  }

  const trimmedName = companyName.trim();
  if (!trimmedName) {
    return fail('invalid_name', 'Holding name must not be empty');
  }

  const cost = MoneyValue.fromMinor(config.holdingCompanyCostMinor);
  if (appState.player.cashBalance.amountMinorUnits < cost.amountMinorUnits) {
    return fail('insufficient_funds', 'Not enough cash to create holding company');
  }

  const company = createHolding(trimmedName, nowUnix);
  appState.player.cashBalance = appState.player.cashBalance.subtract(cost);
  appState.player.holdingCompanyId = company.id;
  appState.companies.push(company);
  applyRankIfImproved(appState, config);
  return ok(company);
}

export function createSubsidiaryCompany(
  appState: AppState,
  config: EconomyConfig,
  industryId: string,
  companyName: string,
  nowUnix: number,
): OperationResult<CompanyState> {
  if (!hasHolding(appState.player)) {
    return fail('holding_required', 'Create your holding company first');
  }

  const industry = getIndustry(config, industryId);
  if (!industry) {
    return fail('unknown_industry', `Industry not found: ${industryId}`);
  }

  if (!isIndustryUnlocked(industry, appState.player.businessRank)) {
    return fail(
      'industry_locked',
      `Industry requires business rank ${industry.minBusinessRank}`,
    );
  }

  const subsidiaryCount = getSubsidiaries(appState).length;
  const maxSubsidiaries = getMaxCompaniesForLevel(config, appState.player.businessRank);
  if (subsidiaryCount >= maxSubsidiaries) {
    return fail('company_limit_reached', 'Maximum number of subsidiaries reached');
  }

  const trimmedName = companyName.trim();
  if (!trimmedName) {
    return fail('invalid_name', 'Company name must not be empty');
  }

  const cost = MoneyValue.fromMinor(getIndustryFoundingCost(industry, config));
  if (appState.player.cashBalance.amountMinorUnits < cost.amountMinorUnits) {
    return fail('insufficient_funds', 'Not enough cash to start this subsidiary');
  }

  const company = createSubsidiary(industry, trimmedName, nowUnix);
  appState.player.cashBalance = appState.player.cashBalance.subtract(cost);
  appState.companies.push(company);
  appState.player.onboardingCompleted = true;
  applyRankIfImproved(appState, config);
  return ok(company);
}

export function upgradeCompany(
  appState: AppState,
  config: EconomyConfig,
  companyId: string,
  nowUnix: number,
): OperationResult<CompanyState> {
  const company = findCompany(appState, companyId);
  if (!company) {
    return fail('company_not_found', 'Company not found');
  }
  if (company.companyKind === 'holding') {
    return fail('invalid_company_kind', 'Holding companies cannot be upgraded');
  }

  const industry = getIndustry(config, company.industryId);
  if (!industry) {
    return fail('unknown_industry', 'Industry not found');
  }

  const upgradeCostMinor = getLevelUpgradeCost(company, industry);
  const upgradeCost = MoneyValue.fromMinor(upgradeCostMinor);
  if (appState.player.cashBalance.amountMinorUnits < upgradeCost.amountMinorUnits) {
    return fail('insufficient_funds', 'Not enough cash for upgrade');
  }

  const upgraded = applyLevelUpgrade(company, industry, nowUnix);
  appState.player.cashBalance = appState.player.cashBalance.subtract(upgradeCost);

  const index = appState.companies.findIndex((c) => c.id === companyId);
  if (index >= 0) {
    appState.companies[index] = upgraded;
  }

  applyRankIfImproved(appState, config);
  return ok(upgraded);
}

export function performActivity(
  appState: AppState,
  company: CompanyState,
  activity: ActivityDefinition,
  nowUnix: number,
): OperationResult<MoneyValue> {
  if (company.companyKind !== activity.appliesTo) {
    return fail('invalid_company_kind', 'Activity not available for this company type');
  }

  const cooldownKey = `${company.id}:${activity.id}`;
  const readyAt = appState.activityCooldowns[cooldownKey] ?? 0;
  if (nowUnix < readyAt) {
    const remaining = readyAt - nowUnix;
    return fail('activity_on_cooldown', `Activity available in ${remaining} seconds`);
  }

  const reward = MoneyValue.fromMinor(activity.rewardMinor);
  appState.player.cashBalance = appState.player.cashBalance.add(reward);
  appState.activityCooldowns[cooldownKey] = nowUnix + activity.cooldownSeconds;
  return ok(reward);
}

export function getActivityCooldownRemaining(
  appState: AppState,
  companyId: string,
  activityId: string,
  nowUnix: number,
): number {
  const readyAt = appState.activityCooldowns[`${companyId}:${activityId}`] ?? 0;
  return Math.max(0, readyAt - nowUnix);
}

export function listAvailableIndustries(
  config: EconomyConfig,
  businessRank: number,
) {
  return getUnlockedIndustries(config, businessRank);
}
