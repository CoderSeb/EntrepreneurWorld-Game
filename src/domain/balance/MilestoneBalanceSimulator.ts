import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { createPlayerState } from '@/domain/core/PlayerState';
import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { createHoldingCompany, createSubsidiaryCompany } from '@/domain/companies/CompanyService';
import { simulateTick } from '@/domain/economy/EconomySimulator';
import { processCompanyProgression } from '@/domain/companies/CompanyProgressionService';
import { calculateHourlyNetMinor } from '@/domain/economy/CompanyIncomeService';
import economyJson from '../../../assets/config/economy_config_v1.json';

export type MilestoneTargets = {
  firstSubsidiaryMinutes: [number, number];
  firstUpgradeMinutes: [number, number];
  firstExecutiveMinutes: [number, number];
  rank5Minutes: [number, number];
};

export type MilestoneSimulationReport = {
  elapsedMinutes: number;
  subsidiaryCreatedMinute: number | null;
  firstUpgradeMinute: number | null;
  firstExecutiveMinute: number | null;
  rank5Minute: number | null;
  hourlyNetMinor: number;
  warnings: string[];
};

const DEFAULT_TARGETS: MilestoneTargets = {
  firstSubsidiaryMinutes: [1, 3],
  firstUpgradeMinutes: [3, 7],
  firstExecutiveMinutes: [15, 30],
  rank5Minutes: [30, 60],
};

export function simulateOnboardingMilestones(
  targets: MilestoneTargets = DEFAULT_TARGETS,
  maxMinutes = 90,
): MilestoneSimulationReport {
  const config = parseEconomyConfig(economyJson as never);
  const state = createAppState();
  state.player = createPlayerState();
  state.player.personalCashBalance = MoneyValue.fromMinor(config.startingCashMinor);

  const tickSeconds = 60;
  let nowUnix = 1_700_000_000;
  const warnings: string[] = [];
  let subsidiaryCreatedMinute: number | null = null;
  let firstUpgradeMinute: number | null = null;
  let firstExecutiveMinute: number | null = null;
  let rank5Minute: number | null = null;

  createHoldingCompany(state, config, 'Orbit Holdings', nowUnix);
  createSubsidiaryCompany(state, config, 'cafe', 'Morning Brew', nowUnix);
  subsidiaryCreatedMinute = 0;

  const maxTicks = Math.ceil((maxMinutes * 60) / tickSeconds);
  for (let tick = 0; tick < maxTicks; tick += 1) {
    nowUnix += tickSeconds;
    simulateTick(state.player, state.companies, tickSeconds, config, state.marketState);
    processCompanyProgression(state, config, tickSeconds, nowUnix);

    const minute = ((tick + 1) * tickSeconds) / 60;
    const subsidiary = state.companies.find((company) => company.companyKind === 'subsidiary');
    if (subsidiary && subsidiary.level > 1 && firstUpgradeMinute == null) {
      firstUpgradeMinute = minute;
    }
    if (
      subsidiary
      && Object.keys(subsidiary.executiveContracts).length > 0
      && firstExecutiveMinute == null
    ) {
      firstExecutiveMinute = minute;
    }
    if (state.player.businessRank >= 5 && rank5Minute == null) {
      rank5Minute = minute;
    }
  }

  const elapsedMinutes = maxMinutes;
  if (
    subsidiaryCreatedMinute != null
    && !withinRange(subsidiaryCreatedMinute, targets.firstSubsidiaryMinutes)
  ) {
    warnings.push('first_subsidiary_out_of_range');
  }
  if (firstUpgradeMinute != null && !withinRange(firstUpgradeMinute, targets.firstUpgradeMinutes)) {
    warnings.push('first_upgrade_out_of_range');
  }
  if (firstExecutiveMinute == null) {
    warnings.push('first_executive_not_reached');
  } else if (!withinRange(firstExecutiveMinute, targets.firstExecutiveMinutes)) {
    warnings.push('first_executive_out_of_range');
  }
  if (rank5Minute == null) {
    warnings.push('rank_5_not_reached');
  } else if (!withinRange(rank5Minute, targets.rank5Minutes)) {
    warnings.push('rank_5_out_of_range');
  }

  return {
    elapsedMinutes,
    subsidiaryCreatedMinute,
    firstUpgradeMinute,
    firstExecutiveMinute,
    rank5Minute,
    hourlyNetMinor: calculateHourlyNetMinor(state.companies, config, state.marketState),
    warnings,
  };
}

function withinRange(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}
