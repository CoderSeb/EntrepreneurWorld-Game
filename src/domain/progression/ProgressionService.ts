import { EconomyConfig, getMaxCompaniesForLevel, IndustryDefinition } from '@/domain/config/EconomyConfig';
import { AppState } from '@/domain/core/AppState';
import { CompanyState } from '@/domain/core/CompanyState';

export function calculateNetWorthMinor(appState: AppState): number {
  let total = appState.player.cashBalance.amountMinorUnits;
  for (const company of appState.companies) {
    if (company.companyKind === 'subsidiary') {
      total += company.revenuePerHour.amountMinorUnits * 24;
      total += company.cashBalance.amountMinorUnits;
    }
  }
  for (const loan of appState.player.activeLoans) {
    total -= loan.remainingMinor;
  }
  return Math.max(0, total);
}

export function evaluateBusinessRank(appState: AppState, config: EconomyConfig): number {
  const subsidiaries = appState.companies.filter((c) => c.companyKind === 'subsidiary').length;
  const netWorth = calculateNetWorthMinor(appState);
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
