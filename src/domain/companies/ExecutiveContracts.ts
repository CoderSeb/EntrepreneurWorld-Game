import { EconomyConfig, ManagerDefinition } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';

export type ExecutiveContract = {
  expiresAtUnix: number;
};

export const EXECUTIVE_CONTRACT_HOURS = 72;
export const EXECUTIVE_LEVEL_COST_SCALE = 0.12;

export function scaledExecutiveHireCost(baseCostMinor: number, companyLevel: number): number {
  return Math.round(baseCostMinor * (1 + Math.max(0, companyLevel - 1) * EXECUTIVE_LEVEL_COST_SCALE));
}

export function scaledExecutiveSalary(baseSalaryMinor: number, companyLevel: number): number {
  return Math.round(baseSalaryMinor * (1 + Math.max(0, companyLevel - 1) * EXECUTIVE_LEVEL_COST_SCALE));
}

export function isExecutiveHired(
  company: CompanyState,
  roleId: string,
  nowUnix: number = Math.floor(Date.now() / 1000),
): boolean {
  const contract = company.executiveContracts[roleId];
  return contract != null && contract.expiresAtUnix > nowUnix;
}

export function expireExecutiveContracts(company: CompanyState, nowUnix: number): void {
  for (const [roleId, contract] of Object.entries(company.executiveContracts)) {
    if (contract.expiresAtUnix <= nowUnix) {
      delete company.executiveContracts[roleId];
    }
  }
}

export function getExecutiveSalaryMinor(
  company: CompanyState,
  role: ManagerDefinition,
): number {
  return scaledExecutiveSalary(role.salaryPerHourMinor, company.level);
}

export function getExecutiveHireCostMinor(
  company: CompanyState,
  role: ManagerDefinition,
): number {
  return scaledExecutiveHireCost(role.hireCostMinor, company.level);
}

export function countActiveExecutives(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
): number {
  return config.managers.filter(
    (role) => role.appliesTo === company.companyKind && isExecutiveHired(company, role.id, nowUnix),
  ).length;
}
