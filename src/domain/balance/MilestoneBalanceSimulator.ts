import { createAppState } from '@/domain/core/AppState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { createPlayerState } from '@/domain/core/PlayerState';
import {
  EconomyConfig,
  getActivitiesForKind,
  getIndustry,
  parseEconomyConfig,
} from '@/domain/config/EconomyConfig';
import {
  createHoldingCompany,
  createSubsidiaryCompany,
  getActivityCooldownRemaining,
  performActivity,
} from '@/domain/companies/CompanyService';
import { simulateTick } from '@/domain/economy/EconomySimulator';
import { processCompanyProgression } from '@/domain/companies/CompanyProgressionService';
import { calculateHourlyNetMinor } from '@/domain/economy/CompanyIncomeService';
import { hireExecutiveRole, upgradeAutomation } from '@/domain/companies/ManagementService';
import { upgradeTrack, getTrackLevel } from '@/domain/companies/UpgradeTrackService';
import { isExecutiveHired } from '@/domain/companies/ExecutiveContracts';
import { CompanyState } from '@/domain/core/CompanyState';
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

const HOLDING_FOUND_MINUTE = 1;
const SUBSIDIARY_FOUND_MINUTE = 2;

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
      simulateTick(state.player, state.companies, tickSeconds, config, state.marketState);
      runEngagedPlayerTurn(state, config, nowUnix);
      processCompanyProgression(state, config, tickSeconds, nowUnix);
    }

    const subsidiary = state.companies.find((company) => company.companyKind === 'subsidiary');
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
    subsidiaryCreatedMinute != null
      ? calculateHourlyNetMinor(state.companies, config, state.marketState)
      : 0;

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

function runEngagedPlayerTurn(
  state: ReturnType<typeof createAppState>,
  config: EconomyConfig,
  nowUnix: number,
): void {
  const subsidiary = state.companies.find((company) => company.companyKind === 'subsidiary');
  if (!subsidiary) {
    return;
  }

  for (const activity of getActivitiesForKind(config, subsidiary.companyKind)) {
    if (getActivityCooldownRemaining(state, subsidiary.id, activity.id, nowUnix) > 0) {
      continue;
    }
    performActivity(state, subsidiary, activity, nowUnix);
  }

  const industry = getIndustry(config, subsidiary.industryId);
  const ceoHired = isExecutiveHired(subsidiary, 'ceo', nowUnix);
  const preferredTrackId = industry?.preferredTrackId;

  if (preferredTrackId) {
    const trackLevel = getTrackLevel(subsidiary, preferredTrackId);
    if (!ceoHired && trackLevel < 1) {
      upgradeTrack(state, subsidiary.id, preferredTrackId, config, nowUnix);
    } else if (ceoHired) {
      upgradeTrack(state, subsidiary.id, preferredTrackId, config, nowUnix);
    }
  }

  if (!ceoHired) {
    hireExecutiveRole(state, config, subsidiary.id, 'ceo', nowUnix);
  } else {
    upgradeAutomation(state, config, subsidiary.id, nowUnix);
  }
}

function hasPurchasedUpgrade(company: CompanyState): boolean {
  if (company.automationLevel > 0) {
    return true;
  }
  return Object.values(company.upgradeTrackLevels).some((level) => level > 0);
}

function withinRange(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}
