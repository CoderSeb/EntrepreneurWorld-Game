import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { CompanyState } from '@/domain/core/CompanyState';
import { MoneyValue } from '@/domain/money/MoneyValue';

export function makeTestCompany(overrides: Partial<CompanyState> = {}): CompanyState {
  return {
    id: 'co-1',
    name: 'Test Co',
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId: 'cafe',
    level: 1,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel: 0,
    automationPolicy: 'balanced',
    executiveContracts: {},
    activeEffects: [],
    integrationDebtMinor: 0,
    integrationComplete: true,
    lifetimeProfitMinor: 0,
    employeeCount: 1,
    payrollLevel: 1,
    revenuePerHour: MoneyValue.fromMinor(100_000),
    expensesPerHour: MoneyValue.fromMinor(60_000),
    riskLevel: 0.2,
    upgradeTrackLevels: {},
    createdAtUnix: 0,
    updatedAtUnix: 0,
    ...overrides,
  };
}
