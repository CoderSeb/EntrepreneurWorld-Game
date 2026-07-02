import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { CompanyState } from '@/domain/core/CompanyState';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { getRevenuePerHour } from '@/domain/economy/EffectiveEconomyCalculator';
import { MoneyValue } from '@/domain/money/MoneyValue';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

function makeSubsidiary(industryId: string, revenueMinor: number, expensesMinor: number): CompanyState {
  return {
    id: `co-${industryId}`,
    name: 'Test Co',
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId,
    level: 1,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel: 0,
    executiveHires: {},
    lifetimeProfitMinor: 0,
    employeeCount: 0,
    revenuePerHour: MoneyValue.fromMinor(revenueMinor),
    expensesPerHour: MoneyValue.fromMinor(expensesMinor),
    riskLevel: 0.2,
    upgradeTrackLevels: {},
    createdAtUnix: 0,
    updatedAtUnix: 0,
  };
}

describe('EffectiveEconomyCalculator preferred track bonus', () => {
  it('applies +8% revenue when preferred track has at least one level', () => {
    const company = makeSubsidiary('cafe', 120_000, 70_000);
    const opsBonus = config.upgradeTracks.find((track) => track.id === 'operations')!.revenueBonusPerLevel;

    company.upgradeTrackLevels.operations = 1;
    const boosted = getRevenuePerHour(company, config, {}).amountMinorUnits;
    const trackOnly = Math.round(120_000 * (1 + opsBonus));

    expect(boosted).toBe(Math.round(trackOnly * 1.08));
  });

  it('does not apply preferred bonus on non-preferred tracks', () => {
    const company = makeSubsidiary('ecommerce', 140_000, 95_000);
    const opsBonus = config.upgradeTracks.find((track) => track.id === 'operations')!.revenueBonusPerLevel;

    company.upgradeTrackLevels.operations = 1;
    const withOps = getRevenuePerHour(company, config, {}).amountMinorUnits;
    const trackOnly = Math.round(140_000 * (1 + opsBonus));

    expect(withOps).toBe(trackOnly);
    expect(withOps).toBeLessThan(Math.round(trackOnly * 1.08));
  });
});
