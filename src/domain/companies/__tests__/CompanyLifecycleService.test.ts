import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { MoneyValue } from '@/domain/money/MoneyValue';
import {
  getCompanyLifecyclePhase,
  getLifecycleLevelThresholdMultiplier,
  getLifecycleOrganicProfitMultiplier,
} from '@/domain/companies/CompanyLifecycleService';

function makeCompany(level: number) {
  return {
    id: 'co-1',
    name: 'Test',
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId: 'cafe',
    level,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel: 0,
    automationPolicy: 'balanced' as const,
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
  };
}

describe('CompanyLifecycleService', () => {
  it('classifies startup, growth, and mature phases by level', () => {
    expect(getCompanyLifecyclePhase(makeCompany(1))).toBe('startup');
    expect(getCompanyLifecyclePhase(makeCompany(3))).toBe('growth');
    expect(getCompanyLifecyclePhase(makeCompany(6))).toBe('mature');
  });

  it('adjusts threshold and organic profit by phase', () => {
    const startup = getLifecycleLevelThresholdMultiplier('startup');
    const mature = getLifecycleLevelThresholdMultiplier('mature');
    expect(startup).toBeLessThan(mature);
    expect(getLifecycleOrganicProfitMultiplier('startup')).toBeGreaterThan(1);
    expect(getLifecycleOrganicProfitMultiplier('mature')).toBeLessThan(1);
  });
});
