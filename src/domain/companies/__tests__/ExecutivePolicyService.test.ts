import { createAppState } from '@/domain/core/AppState';
import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import {
  filterActivitiesForAutomation,
  shouldAutomateActivity,
} from '@/domain/companies/ExecutivePolicyService';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

import { ExecutiveAutomationPolicy } from '@/domain/companies/ExecutivePolicyService';

function createCompany(policy: ExecutiveAutomationPolicy) {
  return {
    id: 'sub-1',
    name: 'Test Co',
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId: 'cafe',
    level: 3,
    cashBalance: MoneyValue.fromMinor(100_000),
    reputation: 0,
    automationLevel: 0,
    automationPolicy: policy,
    executiveContracts: { ceo: { expiresAtUnix: 999_999 } },
    activeEffects: [],
    integrationDebtMinor: 0,
    integrationComplete: true,
    lifetimeProfitMinor: 0,
    employeeCount: 2,
    payrollLevel: 1,
    revenuePerHour: MoneyValue.fromMinor(120_000),
    expensesPerHour: MoneyValue.fromMinor(70_000),
    riskLevel: 0.2,
    upgradeTrackLevels: {},
    createdAtUnix: 0,
    updatedAtUnix: 0,
  };
}

describe('ExecutivePolicyService', () => {
  it('blocks automation under cash_reserve when cash is low', () => {
    const company = createCompany('cash_reserve');
    company.cashBalance = MoneyValue.fromMinor(10_000);
    const activity = config.activities[0];
    expect(
      shouldAutomateActivity(company, activity, config, {}, 100),
    ).toBe(false);
  });

  it('prefers revenue activities for aggressive_growth ordering', () => {
    const company = createCompany('balanced');
    company.automationPolicy = 'aggressive_growth';
    const activities = filterActivitiesForAutomation(
      company,
      config.activities.filter((entry) => entry.appliesTo === 'subsidiary'),
      config,
      createAppState().marketState,
      100,
    );
    const firstRevenueIndex = activities.findIndex(
      (entry) => entry.effectType === 'temporary_revenue_multiplier',
    );
    expect(firstRevenueIndex).toBeGreaterThanOrEqual(0);
    if (firstRevenueIndex > 0) {
      expect(activities[0].effectType).toBe('temporary_revenue_multiplier');
    }
  });
});
