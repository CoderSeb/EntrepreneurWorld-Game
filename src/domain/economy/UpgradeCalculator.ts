import { IndustryDefinition } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';

export function getUpgradeCost(company: CompanyState, industry: IndustryDefinition) {
  const baseCost = Math.max(10_000, Math.floor(industry.startCostMinor / 10));
  return baseCost * company.level;
}

export function applyLevelUpgrade(
  company: CompanyState,
  industry: IndustryDefinition,
  nowUnix: number,
): CompanyState {
  return {
    ...company,
    level: company.level + 1,
    revenuePerHour: company.revenuePerHour.multiplyScalar(1.13),
    expensesPerHour: company.expensesPerHour.multiplyScalar(0.98),
    updatedAtUnix: nowUnix,
    riskLevel: Math.min(1, company.riskLevel + industry.riskProfile * 0.01),
  };
}
