import { CompanyState } from '@/domain/core/CompanyState';

export type CompanyLifecyclePhase = 'startup' | 'growth' | 'mature';

export function getCompanyLifecyclePhase(company: CompanyState): CompanyLifecyclePhase {
  if (company.level <= 2) {
    return 'startup';
  }
  if (company.level <= 5) {
    return 'growth';
  }
  return 'mature';
}

export function getLifecycleLevelThresholdMultiplier(phase: CompanyLifecyclePhase): number {
  switch (phase) {
    case 'startup':
      return 0.85;
    case 'growth':
      return 1;
    case 'mature':
      return 1.15;
    default:
      return 1;
  }
}

export function getLifecycleOrganicProfitMultiplier(phase: CompanyLifecyclePhase): number {
  switch (phase) {
    case 'startup':
      return 1.08;
    case 'growth':
      return 1;
    case 'mature':
      return 0.92;
    default:
      return 1;
  }
}

export function getLevelThresholdForPhase(
  company: CompanyState,
  baseRevenuePerHourMinor: number,
): number {
  const phase = getCompanyLifecyclePhase(company);
  return Math.max(
    20_000,
    Math.round(
      baseRevenuePerHourMinor * company.level * 0.45 * getLifecycleLevelThresholdMultiplier(phase),
    ),
  );
}

export function getOrganicProfitMultiplier(company: CompanyState): number {
  return getLifecycleOrganicProfitMultiplier(getCompanyLifecyclePhase(company));
}
