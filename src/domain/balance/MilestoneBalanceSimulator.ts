import {
  DEFAULT_TARGETS,
  MilestoneSimulationReport,
  MilestoneTargets,
} from '@/domain/balance/MilestoneBalanceSimulator.types';
import {
  createFreshAppState,
  ENGAGED_ONBOARDING_TURN,
  getPrimarySubsidiary,
  hasPurchasedUpgrade,
  loadBundledEconomyConfig,
  portfolioHourlyNetMinor,
  runActiveMinute,
  HOLDING_FOUND_MINUTE,
  SUBSIDIARY_FOUND_MINUTE,
} from '@/domain/balance/BalanceSimulationCore';
import { createHoldingCompany, createSubsidiaryCompany } from '@/domain/companies/CompanyService';

export type { MilestoneTargets, MilestoneSimulationReport } from '@/domain/balance/MilestoneBalanceSimulator.types';
export { DEFAULT_TARGETS } from '@/domain/balance/MilestoneBalanceSimulator.types';

export function simulateOnboardingMilestones(
  targets: MilestoneTargets = DEFAULT_TARGETS,
  maxMinutes = 90,
): MilestoneSimulationReport {
  const config = loadBundledEconomyConfig();
  const state = createFreshAppState(config);

  const tickSeconds = 60;
  let nowUnix = 1_700_000_000;
  const warnings: string[] = [];
  let subsidiaryCreatedMinute: number | null = null;
  let firstUpgradeMinute: number | null = null;
  let firstExecutiveMinute: number | null = null;
  let rank5Minute: number | null = null;
  let holdingCreated = false;

  const maxTicks = Math.ceil((maxMinutes * 60) / tickSeconds);
  for (let tick = 0; tick < maxTicks; tick += 1) {
    nowUnix += tickSeconds;
    const minute = ((tick + 1) * tickSeconds) / 60;

    if (!holdingCreated && minute >= HOLDING_FOUND_MINUTE) {
      createHoldingCompany(state, config, 'Orbit Holdings', nowUnix);
      holdingCreated = true;
    }

    if (holdingCreated && subsidiaryCreatedMinute == null && minute >= SUBSIDIARY_FOUND_MINUTE) {
      createSubsidiaryCompany(state, config, 'cafe', 'Morning Brew', nowUnix);
      subsidiaryCreatedMinute = minute;
    }

    if (subsidiaryCreatedMinute != null) {
      runActiveMinute(state, config, tickSeconds, nowUnix, ENGAGED_ONBOARDING_TURN);
    }

    const subsidiary = getPrimarySubsidiary(state);
    if (subsidiary && hasPurchasedUpgrade(subsidiary) && firstUpgradeMinute == null) {
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

  if (
    subsidiaryCreatedMinute != null
    && !withinRange(subsidiaryCreatedMinute, targets.firstSubsidiaryMinutes)
  ) {
    warnings.push('first_subsidiary_out_of_range');
  }
  if (firstUpgradeMinute == null) {
    warnings.push('first_upgrade_not_reached');
  } else if (!withinRange(firstUpgradeMinute, targets.firstUpgradeMinutes)) {
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

  const hourlyNetMinor =
    subsidiaryCreatedMinute != null ? portfolioHourlyNetMinor(state, config) : 0;

  if (hourlyNetMinor <= 0) {
    warnings.push('negative_hourly_net');
  }

  return {
    elapsedMinutes: maxMinutes,
    subsidiaryCreatedMinute,
    firstUpgradeMinute,
    firstExecutiveMinute,
    rank5Minute,
    hourlyNetMinor,
    warnings,
  };
}

function withinRange(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}
