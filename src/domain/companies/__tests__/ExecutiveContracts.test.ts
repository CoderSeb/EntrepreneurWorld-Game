import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { CompanyState } from '@/domain/core/CompanyState';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import {
  EXECUTIVE_CONTRACT_HOURS,
  expireExecutiveContracts,
  getExecutiveHireCostMinor,
  isExecutiveHired,
  scaledExecutiveHireCost,
} from '@/domain/companies/ExecutiveContracts';
import { MoneyValue } from '@/domain/money/MoneyValue';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

function makeCompany(level = 1): CompanyState {
  return {
    id: 'co-1',
    name: 'Test Co',
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

describe('ExecutiveContracts', () => {
  it('scales hire cost with company level', () => {
    expect(scaledExecutiveHireCost(100_000, 1)).toBe(100_000);
    expect(scaledExecutiveHireCost(100_000, 3)).toBeGreaterThan(100_000);
  });

  it('detects active and expired contracts', () => {
    const company = makeCompany();
    const now = 1_000_000;
    company.executiveContracts.cmo = { expiresAtUnix: now + 3600 };
    expect(isExecutiveHired(company, 'cmo', now)).toBe(true);
    expect(isExecutiveHired(company, 'cmo', now + 3601)).toBe(false);
  });

  it('expires stale contracts during progression', () => {
    const company = makeCompany();
    company.executiveContracts.ceo = { expiresAtUnix: 500 };
    expireExecutiveContracts(company, 501);
    expect(company.executiveContracts.ceo).toBeUndefined();
  });

  it('uses manager definition for scaled hire cost', () => {
    const company = makeCompany(4);
    const cmo = config.managers.find((role) => role.id === 'cmo')!;
    const cost = getExecutiveHireCostMinor(company, cmo);
    expect(cost).toBe(scaledExecutiveHireCost(cmo.hireCostMinor, 4));
    expect(EXECUTIVE_CONTRACT_HOURS).toBe(72);
  });
});
