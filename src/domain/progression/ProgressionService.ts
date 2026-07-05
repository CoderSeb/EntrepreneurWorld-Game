import { EconomyConfig, getMaxCompaniesForLevel, IndustryDefinition } from '@/domain/config/EconomyConfig';
import { AppState } from '@/domain/core/AppState';

export function calculateConglomerateNetWorthMinor(appState: AppState): number {
  let total = 0;
  for (const company of appState.companies) {
    total += company.cashBalance.amountMinorUnits;
    if (company.companyKind === 'subsidiary') {
      total += company.revenuePerHour.amountMinorUnits * 24;
    }
  }
  for (const loan of appState.player.activeLoans) {
    total -= loan.remainingMinor;
  }
  return Math.max(0, total);
}

export function calculatePersonalNetWorthMinor(appState: AppState): number {
  return Math.max(0, appState.player.personalCashBalance.amountMinorUnits);
}

/** Total empire value including personal liquid assets. */
export function calculateNetWorthMinor(appState: AppState): number {
  return calculateConglomerateNetWorthMinor(appState) + calculatePersonalNetWorthMinor(appState);
}

export function evaluateBusinessRank(appState: AppState, config: EconomyConfig): number {
  const subsidiaries = appState.companies.filter((c) => c.companyKind === 'subsidiary').length;
  const netWorth = calculateConglomerateNetWorthMinor(appState);
  let highestRank = 1;

  for (const milestone of config.rankMilestones) {
    if (
      subsidiaries >= milestone.requiredSubsidiaries &&
      netWorth >= milestone.requiredNetWorthMinor
    ) {
      highestRank = Math.max(highestRank, milestone.rank);
    }
  }

  return highestRank;
}

export function applyRankIfImproved(appState: AppState, config: EconomyConfig): boolean {
  const newRank = evaluateBusinessRank(appState, config);
  if (newRank <= appState.player.businessRank) {
    return false;
  }

  appState.player.businessRank = newRank;
  appState.player.maxCompanies = getMaxCompaniesForLevel(config, newRank);
  return true;
}

export function isIndustryUnlocked(industry: IndustryDefinition, businessRank: number): boolean {
  return businessRank >= industry.minBusinessRank;
}

export function getUnlockedIndustries(
  config: EconomyConfig,
  businessRank: number,
): IndustryDefinition[] {
  return Object.values(config.industries)
    .filter((industry) => isIndustryUnlocked(industry, businessRank))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
