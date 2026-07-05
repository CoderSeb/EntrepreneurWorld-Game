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

  const capacityCap = getIndustryCapacityCapMinor(company, industry);
  if (capacityCap != null) {
    amountMinor = Math.min(amountMinor, capacityCap);
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
    default:
      return null;
  }
}
