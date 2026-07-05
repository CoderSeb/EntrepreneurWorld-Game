import { EconomyConfig, getUpgradeTrack } from '@/domain/config/EconomyConfig';
import { AppState, findCompany } from '@/domain/core/AppState';
import { CompanyState, isHolding } from '@/domain/core/CompanyState';
import { fail, ok, OperationResult } from '@/domain/core/OperationResult';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { tryDeductForSubsidiaryExpense } from '@/domain/treasury/CompanyTreasury';
import { applyRankIfImproved } from '@/domain/progression/ProgressionService';

export function getTrackLevel(company: CompanyState, trackId: string): number {
  return company.upgradeTrackLevels[trackId] ?? 0;
}

export function getUpgradeCost(company: CompanyState, track: { id: string; maxLevel: number; baseCostMinor: number; costMultiplierPerLevel: number }): MoneyValue {
  const currentLevel = getTrackLevel(company, track.id);
  if (currentLevel >= track.maxLevel) {
    return MoneyValue.zero();
  }
  const multiplier = track.costMultiplierPerLevel ** currentLevel;
  return MoneyValue.fromMinor(Math.round(track.baseCostMinor * multiplier));
}

export function upgradeTrack(
  appState: AppState,
  companyId: string,
  trackId: string,
  config: EconomyConfig,
  nowUnix: number,
): OperationResult<CompanyState> {
  const company = findCompany(appState, companyId);
  if (!company) {
    return fail('company_not_found', 'Company not found');
  }
  if (isHolding(company)) {
    return fail('invalid_company_kind', 'Upgrade tracks apply to subsidiaries only');
  }

  const track = getUpgradeTrack(config, trackId);
  if (!track) {
    return fail('unknown_upgrade_track', 'Upgrade track not found');
  }

  const currentLevel = getTrackLevel(company, trackId);
  if (currentLevel >= track.maxLevel) {
    return fail('track_maxed', 'Upgrade track is already at max level');
  }

  const cost = getUpgradeCost(company, track);
  if (!tryDeductForSubsidiaryExpense(appState, company, cost.amountMinorUnits)) {
    return fail('insufficient_funds', 'Not enough company or holding cash for upgrade');
  }
  company.upgradeTrackLevels[trackId] = currentLevel + 1;
  company.updatedAtUnix = nowUnix;
  applyRankIfImproved(appState, config);
  return ok(company);
}

export function getRevenueMultiplier(company: CompanyState, config: EconomyConfig): number {
  let multiplier = 1;
  for (const track of config.upgradeTracks) {
    const level = getTrackLevel(company, track.id);
    if (level > 0) {
      multiplier += level * track.revenueBonusPerLevel;
    }
  }
  return multiplier;
}

export function getExpenseMultiplier(company: CompanyState, config: EconomyConfig): number {
  let multiplier = 1;
  for (const track of config.upgradeTracks) {
    const level = getTrackLevel(company, track.id);
    if (level > 0) {
      multiplier += level * track.expenseBonusPerLevel;
    }
  }
  return multiplier;
}
