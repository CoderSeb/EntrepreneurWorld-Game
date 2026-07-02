import { EconomyConfig, getAutomationLevel, IndustryDefinition } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';

export function getMaxSystemsLevel(industry: IndustryDefinition, config: EconomyConfig): number {
  const configMax = config.automationLevels.reduce((max, level) => Math.max(max, level.level), 0);
  if (industry.automationPotential < 0.4) {
    return Math.min(1, configMax);
  }
  if (industry.automationPotential < 0.65) {
    return Math.min(2, configMax);
  }
  return configMax;
}

/** Higher automation potential → lower upgrade cost (config costs are the baseline). */
export function getSystemsUpgradeCostMultiplier(industry: IndustryDefinition): number {
  return Math.max(0.75, 1.3 - industry.automationPotential * 0.5);
}

export function getNextSystemsUpgradeCostMinor(
  company: CompanyState,
  industry: IndustryDefinition,
  config: EconomyConfig,
): number | null {
  const maxLevel = getMaxSystemsLevel(industry, config);
  if (company.automationLevel >= maxLevel) {
    return null;
  }

  const definition = getAutomationLevel(config, company.automationLevel + 1);
  if (!definition) {
    return null;
  }

  return Math.round(definition.upgradeCostMinor * getSystemsUpgradeCostMultiplier(industry));
}
