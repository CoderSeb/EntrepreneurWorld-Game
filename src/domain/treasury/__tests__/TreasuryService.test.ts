import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { createAppState } from '@/domain/core/AppState';
import { createPlayerState } from '@/domain/core/PlayerState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { applyCompanyIncomeForHours } from '@/domain/economy/CompanyIncomeService';
import {
  getFoundingFundingBreakdown,
  tryPayForConglomerateInvestment,
} from '@/domain/treasury/CompanyTreasury';
import {
  calculateSalaryPreview,
  transferDividendToHolding,
  withdrawSalaryFromHolding,
} from '@/domain/treasury/TreasuryService';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

function createTestState() {
  const state = createAppState();
  state.player = createPlayerState();
  state.player.personalCashBalance = MoneyValue.fromMinor(1_000_000);
  state.companies.push({
    id: 'holding-1',
    name: 'Holding AB',
    companyKind: CompanyKinds.HOLDING,
    industryId: '',
    level: 1,
    cashBalance: MoneyValue.fromMinor(500_000),
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
    id: 'sub-1',
    name: 'Cafe AB',
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId: 'cafe',
    level: 1,
    cashBalance: MoneyValue.fromMinor(300_000),
    reputation: 0,
    automationLevel: 0,
    automationPolicy: 'balanced' as const,
    executiveContracts: {},
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
  });
  state.player.holdingCompanyId = 'holding-1';
  return state;
}

describe('TreasuryService', () => {
  it('transfers subsidiary cash to holding tax-free', () => {
    const state = createTestState();
    const result = transferDividendToHolding(state, 'sub-1', 200_000, 100, config);
    expect(result.success).toBe(true);
    expect(state.companies.find((c) => c.id === 'sub-1')?.cashBalance.amountMinorUnits).toBe(100_000);
    expect(state.companies.find((c) => c.id === 'holding-1')?.cashBalance.amountMinorUnits).toBe(700_000);
  });

  it('withdraws taxed salary into personal wallet', () => {
    const state = createTestState();
    const preview = calculateSalaryPreview(100_000, config);
    const result = withdrawSalaryFromHolding(state, 100_000, config, 200);
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.data.netMinor).toBe(preview.netMinor);
    expect(state.player.personalCashBalance.amountMinorUnits).toBe(1_000_000 + preview.netMinor);
    expect(state.companies.find((c) => c.id === 'holding-1')?.cashBalance.amountMinorUnits).toBe(400_000);
  });
});

describe('CompanyIncomeService', () => {
  it('applies tick income to subsidiary cash balance', () => {
    const state = createTestState();
    const subsidiary = state.companies.find((c) => c.id === 'sub-1')!;
    const before = subsidiary.cashBalance.amountMinorUnits;
    const net = applyCompanyIncomeForHours(state.companies, 1, config, state.marketState);
    expect(net.amountMinorUnits).not.toBe(0);
    expect(subsidiary.cashBalance.amountMinorUnits).toBeGreaterThan(before);
  });
});

describe('Conglomerate investment funding', () => {
  it('includes subsidiary cash in founding pool', () => {
    const state = createTestState();
    const breakdown = getFoundingFundingBreakdown(state);
    expect(breakdown.subsidiaryMinor).toBe(300_000);
    expect(breakdown.totalMinor).toBe(500_000 + 300_000 + 1_000_000);
  });

  it('pays founding cost from subsidiary cash when holding is empty', () => {
    const state = createTestState();
    state.companies.find((c) => c.id === 'holding-1')!.cashBalance = MoneyValue.zero();
    const paid = tryPayForConglomerateInvestment(state, 420_000);
    expect(paid).toBe(true);
    expect(state.companies.find((c) => c.id === 'sub-1')?.cashBalance.amountMinorUnits).toBe(0);
  });
});
