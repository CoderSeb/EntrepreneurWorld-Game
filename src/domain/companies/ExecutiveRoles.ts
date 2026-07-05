import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';
import {
  EXECUTIVE_CONTRACT_HOURS,
  getExecutiveHireCostMinor,
  getExecutiveSalaryMinor,
  isExecutiveHired,
} from '@/domain/companies/ExecutiveContracts';
import { getExecutiveDescription, getExecutiveTitle } from '@/i18n/configLabels';
import type { TranslationDictionary } from '@/i18n/types';

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
  expiresAtUnix: number | null;
  contractHours: number;
};

export { isExecutiveHired, countActiveExecutives } from '@/domain/companies/ExecutiveContracts';

export function getExecutiveRole(config: EconomyConfig, roleId: string) {
  return config.managers.find((entry) => entry.id === roleId) ?? null;
}

export function buildExecutiveRoleUiModels(
  company: CompanyState,
  config: EconomyConfig,
  nowUnix: number,
  translations?: TranslationDictionary,
): ExecutiveRoleUiModel[] {
  return config.managers
    .filter((role) => role.appliesTo === company.companyKind)
    .map((role) => {
      const contract = company.executiveContracts[role.id];
      const hired = isExecutiveHired(company, role.id, nowUnix);
      return {
        roleId: role.id,
        title: translations ? getExecutiveTitle(role.id, translations) : role.displayName,
        description: translations ? getExecutiveDescription(role.id, translations) : role.description,
        hireCostMinor: getExecutiveHireCostMinor(company, role),
        salaryMinor: getExecutiveSalaryMinor(company, role),
        revenueBoostPercent: Math.round((role.revenueMultiplier - 1) * 100),
        expenseReductionPercent: Math.round((1 - role.expenseMultiplier) * 100),
        automatesOperations: role.automatesTasks,
        hired,
        expiresAtUnix: hired ? contract?.expiresAtUnix ?? null : null,
        contractHours: EXECUTIVE_CONTRACT_HOURS,
      };
    });
}

export function countHiredExecutives(company: CompanyState, config: EconomyConfig, nowUnix: number): number {
  return config.managers.filter(
    (role) => role.appliesTo === company.companyKind && isExecutiveHired(company, role.id, nowUnix),
  ).length;
}
