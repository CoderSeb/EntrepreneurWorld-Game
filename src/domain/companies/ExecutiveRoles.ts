import { EconomyConfig, ManagerDefinition } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';

export type ExecutiveRoleUiModel = {
  roleId: string;
  title: string;
  description: string;
  hireCostMinor: number;
  salaryMinor: number;
  revenueBoostPercent: number;
  expenseReductionPercent: number;
  automatesOperations: boolean;
  hired: boolean;
};

export function isExecutiveHired(company: CompanyState, roleId: string): boolean {
  return Boolean(company.executiveHires[roleId]);
}

export function getExecutiveRole(config: EconomyConfig, roleId: string): ManagerDefinition | null {
  return config.managers.find((entry) => entry.id === roleId) ?? null;
}

export function buildExecutiveRoleUiModels(
  company: CompanyState,
  config: EconomyConfig,
): ExecutiveRoleUiModel[] {
  return config.managers
    .filter((role) => role.appliesTo === company.companyKind)
    .map((role) => ({
      roleId: role.id,
      title: role.displayName,
      description: role.description,
      hireCostMinor: role.hireCostMinor,
      salaryMinor: role.salaryPerHourMinor,
      revenueBoostPercent: Math.round((role.revenueMultiplier - 1) * 100),
      expenseReductionPercent: Math.round((1 - role.expenseMultiplier) * 100),
      automatesOperations: role.automatesTasks,
      hired: isExecutiveHired(company, role.id),
    }));
}

export function countHiredExecutives(company: CompanyState): number {
  return Object.values(company.executiveHires).filter(Boolean).length;
}
