import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { completeAcquisition, payIntegrationDebt } from '@/domain/companies/AcquisitionService';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

describe('AcquisitionService', () => {
  it('creates subsidiary with integration debt from target config', () => {
    const state = createAppState();
    state.player.businessRank = 10;
    state.player.holdingCompanyId = 'holding-1';
    state.companies.push({
      id: 'holding-1',
      name: 'Holding',
      companyKind: CompanyKinds.HOLDING,
      industryId: '',
      level: 1,
      cashBalance: MoneyValue.fromMinor(5_000_000),
      reputation: 0,
      automationLevel: 0,
      automationPolicy: 'balanced' as const,
      executiveContracts: {},
      activeEffects: [],
      integrationDebtMinor: 0,
      integrationComplete: true,
      lifetimeProfitMinor: 0,
      employeeCount: 0,
      payrollLevel: 1,
      revenuePerHour: MoneyValue.zero(),
      expensesPerHour: MoneyValue.zero(),
      riskLevel: 0,
      upgradeTrackLevels: {},
      createdAtUnix: 0,
      updatedAtUnix: 0,
    });

    const result = completeAcquisition(state, config, 'cafe_micro_chain', 'Acquired Cafe', 1000);
    expect(result.success).toBe(true);
    const subsidiary = state.companies.find((entry) => entry.name === 'Acquired Cafe');
    expect(subsidiary?.integrationDebtMinor).toBe(400_000);
    expect(subsidiary?.integrationComplete).toBe(false);
  });

  it('reduces integration debt when company pays', () => {
    const state = createAppState();
    state.companies.push({
      id: 'sub-debt',
      name: 'Debt Co',
      companyKind: CompanyKinds.SUBSIDIARY,
      industryId: 'cafe',
      level: 1,
      cashBalance: MoneyValue.fromMinor(200_000),
      reputation: 0,
      automationLevel: 0,
      automationPolicy: 'balanced' as const,
      executiveContracts: {},
      activeEffects: [],
      integrationDebtMinor: 150_000,
      integrationComplete: false,
      lifetimeProfitMinor: 0,
      employeeCount: 1,
      payrollLevel: 1,
      revenuePerHour: MoneyValue.fromMinor(100_000),
      expensesPerHour: MoneyValue.fromMinor(50_000),
      riskLevel: 0.2,
      upgradeTrackLevels: {},
      createdAtUnix: 0,
      updatedAtUnix: 0,
    });

    const result = payIntegrationDebt(state, 'sub-debt', 100_000);
    expect(result.success).toBe(true);
    expect(state.companies[0].integrationDebtMinor).toBe(50_000);
  });
});
