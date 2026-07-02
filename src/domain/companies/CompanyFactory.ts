import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { newId } from '@/domain/core/IdGenerator';
import { CompanyState } from '@/domain/core/CompanyState';
import { IndustryDefinition } from '@/domain/config/EconomyConfig';
import { MoneyValue } from '@/domain/money/MoneyValue';

export function createHolding(companyName: string, createdAtUnix: number): CompanyState {
  return {
    id: newId('company'),
    name: companyName,
    companyKind: CompanyKinds.HOLDING,
    industryId: '',
    level: 1,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel: 0,
    executiveHires: {},
    lifetimeProfitMinor: 0,
    employeeCount: 0,
    revenuePerHour: MoneyValue.zero(),
    expensesPerHour: MoneyValue.zero(),
    riskLevel: 0,
    upgradeTrackLevels: {},
    createdAtUnix,
    updatedAtUnix: createdAtUnix,
  };
}

export function createSubsidiary(
  industry: IndustryDefinition,
  companyName: string,
  createdAtUnix: number,
): CompanyState {
  return {
    id: newId('company'),
    name: companyName,
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId: industry.id,
    level: 1,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel: 0,
    executiveHires: {},
    lifetimeProfitMinor: 0,
    employeeCount: 0,
    revenuePerHour: MoneyValue.fromMinor(industry.baseRevenuePerHourMinor),
    expensesPerHour: MoneyValue.fromMinor(industry.baseExpensesPerHourMinor),
    riskLevel: industry.riskProfile,
    upgradeTrackLevels: {},
    createdAtUnix,
    updatedAtUnix: createdAtUnix,
  };
}
