import { EconomyConfig, getIndustry, IndustryDefinition } from '@/domain/config/EconomyConfig';
import { CompanyState, isHolding } from '@/domain/core/CompanyState';
import { getTrackLevel } from '@/domain/companies/UpgradeTrackService';
import { MoneyValue } from '@/domain/money/MoneyValue';

export function getIndustryCapacityCapMinor(
  company: CompanyState,
  industry: IndustryDefinition,
): number | null {
  if (industry.mechanics?.primaryBottleneck !== 'capacity') {
    return null;
  }

  const perEmployee = industry.mechanics.capacityPerEmployeeMinor ?? 0;
  if (perEmployee <= 0 || company.employeeCount <= 0) {
    return null;
  }

  const operationsLevel = getTrackLevel(company, 'operations');
  const operationsBonus = 1 + operationsLevel * 0.05;
  return Math.round(company.employeeCount * perEmployee * operationsBonus);
}

export function getIndustryLeverageRevenueMultiplier(
  company: CompanyState,
  industry: IndustryDefinition,
): number {
  if (industry.mechanics?.primaryBottleneck !== 'leverage') {
    return 1;
  }

  const expansionLevel = getTrackLevel(company, 'expansion');
  const bonusPerLevel = industry.mechanics.leverageMultiplierPerExpansionLevel ?? 0.03;
  return 1 + expansionLevel * bonusPerLevel;
}

export function getIndustryVacancyMultiplier(
  company: CompanyState,
  industry: IndustryDefinition,
): number {
  if (industry.mechanics?.primaryBottleneck !== 'leverage') {
    return 1;
  }

  const baseVacancy = industry.mechanics.baseVacancyRate ?? 0.1;
  const expansionLevel = getTrackLevel(company, 'expansion');
  const reduction =
    expansionLevel * (industry.mechanics.vacancyReductionPerExpansionLevel ?? 0.012);
  const occupancy = 1 - Math.max(0, baseVacancy - reduction);
  return Math.max(0.72, Math.min(1, occupancy));
}

export function getIndustryLeverageInterestPerHourMinor(
  company: CompanyState,
  industry: IndustryDefinition,
): number {
  if (industry.mechanics?.primaryBottleneck !== 'leverage') {
    return 0;
  }

  const expansionLevel = getTrackLevel(company, 'expansion');
  if (expansionLevel <= 0) {
    return 0;
  }

  const syntheticDebtMinor = industry.baseRevenuePerHourMinor * 10 * expansionLevel;
  const rate = industry.mechanics.leverageInterestRateHourly ?? 0.000018;
  return Math.round(syntheticDebtMinor * rate);
}

export function getIndustryInventoryCapMinor(
  company: CompanyState,
  industry: IndustryDefinition,
): number | null {
  if (industry.mechanics?.primaryBottleneck !== 'inventory') {
    return null;
  }

  const baseCap = industry.mechanics.inventoryBaseCapMinor ?? 0;
  if (baseCap <= 0) {
    return null;
  }

  const marketingLevel = getTrackLevel(company, 'marketing');
  const bonusPerLevel = industry.mechanics.inventoryBonusPerMarketingLevel ?? 0;
  return Math.round(baseCap * (1 + marketingLevel * bonusPerLevel));
}

export function getIndustryRetentionMultiplier(
  company: CompanyState,
  industry: IndustryDefinition,
): number {
  if (industry.mechanics?.primaryBottleneck !== 'retention') {
    return 1;
  }

  const churnRate = industry.mechanics.baseChurnRate ?? 0;
  const qualityLevel = getTrackLevel(company, 'quality');
  const retentionBonus =
    qualityLevel * (industry.mechanics.retentionBonusPerQualityLevel ?? 0);
  const retention = 1 - churnRate + retentionBonus;
  return Math.max(0.55, Math.min(1.2, retention));
}

export function applyIndustryRevenueConstraints(
  company: CompanyState,
  config: EconomyConfig,
  revenue: MoneyValue,
): MoneyValue {
  if (isHolding(company)) {
    return revenue;
  }

  const industry = getIndustry(config, company.industryId);
  if (!industry) {
    return revenue;
  }

  let amountMinor = revenue.amountMinorUnits;
  amountMinor = Math.round(amountMinor * getIndustryRetentionMultiplier(company, industry));
  amountMinor = Math.round(amountMinor * getIndustryVacancyMultiplier(company, industry));
  amountMinor = Math.round(amountMinor * getIndustryLeverageRevenueMultiplier(company, industry));

  const capacityCap = getIndustryCapacityCapMinor(company, industry);
  if (capacityCap != null) {
    amountMinor = Math.min(amountMinor, capacityCap);
  }

  const inventoryCap = getIndustryInventoryCapMinor(company, industry);
  if (inventoryCap != null) {
    amountMinor = Math.min(amountMinor, inventoryCap);
  }

  return MoneyValue.fromMinor(Math.max(0, amountMinor));
}

export function describeIndustryBottleneck(
  company: CompanyState,
  config: EconomyConfig,
): string | null {
  const industry = getIndustry(config, company.industryId);
  if (!industry?.mechanics) {
    return null;
  }

  switch (industry.mechanics.primaryBottleneck) {
    case 'capacity': {
      const cap = getIndustryCapacityCapMinor(company, industry);
      return cap != null ? `capacity_cap_${cap}` : null;
    }
    case 'retention': {
      const retention = getIndustryRetentionMultiplier(company, industry);
      return `retention_${Math.round(retention * 100)}`;
    }
    case 'inventory': {
      const cap = getIndustryInventoryCapMinor(company, industry);
      return cap != null ? `inventory_cap_${cap}` : null;
    }
    case 'leverage': {
      const occupancy = Math.round(getIndustryVacancyMultiplier(company, industry) * 100);
      const interest = getIndustryLeverageInterestPerHourMinor(company, industry);
      return `leverage_occupancy_${occupancy}_interest_${interest}`;
    }
    default:
      return null;
  }
}
