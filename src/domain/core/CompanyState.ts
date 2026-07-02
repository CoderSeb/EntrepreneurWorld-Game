import { MoneyValue } from '@/domain/money/MoneyValue';
import { CompanyKind, CompanyKinds } from '@/domain/core/CompanyKinds';

export type CompanyState = {
  id: string;
  name: string;
  companyKind: CompanyKind;
  industryId: string;
  level: number;
  cashBalance: MoneyValue;
  reputation: number;
  automationLevel: number;
  executiveHires: Record<string, boolean>;
  lifetimeProfitMinor: number;
  employeeCount: number;
  revenuePerHour: MoneyValue;
  expensesPerHour: MoneyValue;
  riskLevel: number;
  upgradeTrackLevels: Record<string, number>;
  createdAtUnix: number;
  updatedAtUnix: number;
};

export function isHolding(company: CompanyState): boolean {
  return company.companyKind === CompanyKinds.HOLDING;
}

export function isSubsidiary(company: CompanyState): boolean {
  return company.companyKind === CompanyKinds.SUBSIDIARY;
}

export function netIncomePerHour(company: CompanyState): MoneyValue {
  return company.revenuePerHour.subtract(company.expensesPerHour);
}

export function duplicateCompanyState(company: CompanyState): CompanyState {
  return {
    id: company.id,
    name: company.name,
    companyKind: company.companyKind,
    industryId: company.industryId,
    level: company.level,
    cashBalance: MoneyValue.fromMinor(company.cashBalance.amountMinorUnits),
    reputation: company.reputation,
    automationLevel: company.automationLevel,
    executiveHires: { ...company.executiveHires },
    lifetimeProfitMinor: company.lifetimeProfitMinor,
    employeeCount: company.employeeCount,
    revenuePerHour: MoneyValue.fromMinor(company.revenuePerHour.amountMinorUnits),
    expensesPerHour: MoneyValue.fromMinor(company.expensesPerHour.amountMinorUnits),
    riskLevel: company.riskLevel,
    upgradeTrackLevels: { ...company.upgradeTrackLevels },
    createdAtUnix: company.createdAtUnix,
    updatedAtUnix: company.updatedAtUnix,
  };
}
