import { createAppState } from '@/domain/core/AppState';
import { createPlayerState } from '@/domain/core/PlayerState';
import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { applyRankIfImproved, calculateNetWorthMinor } from '@/domain/progression/ProgressionService';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

describe('ProgressionService', () => {
  it('calculates net worth from cash and subsidiaries', () => {
    const state = createAppState();
    state.player = createPlayerState();
    state.player.personalCashBalance = MoneyValue.fromMinor(1_000_000);
    state.companies.push({
      id: 'sub1',
      name: 'Sub',
      companyKind: CompanyKinds.SUBSIDIARY,
      industryId: 'cafe',
      level: 1,
      cashBalance: MoneyValue.fromMinor(50_000),
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
      revenuePerHour: MoneyValue.fromMinor(100_000),
      expensesPerHour: MoneyValue.fromMinor(60_000),
      riskLevel: 0.2,
      upgradeTrackLevels: {},
      createdAtUnix: 0,
      updatedAtUnix: 0,
    });

    const netWorth = calculateNetWorthMinor(state);
    expect(netWorth).toBe(1_000_000 + 50_000 + 100_000 * 24);
  });

  it('promotes business rank when milestones met', () => {
    const state = createAppState();
    state.player = createPlayerState();
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
    state.companies.push({
      id: 'sub1',
      name: 'Sub',
      companyKind: CompanyKinds.SUBSIDIARY,
      industryId: 'cafe',
      level: 1,
      cashBalance: MoneyValue.zero(),
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
      revenuePerHour: MoneyValue.fromMinor(120_000),
      expensesPerHour: MoneyValue.fromMinor(70_000),
      riskLevel: 0.2,
      upgradeTrackLevels: {},
      createdAtUnix: 0,
      updatedAtUnix: 0,
    });

    const improved = applyRankIfImproved(state, config);
    expect(improved).toBe(true);
    expect(state.player.businessRank).toBeGreaterThan(1);
  });
});
