export type OfflineEfficiencySegment = {
  fromHours: number;
  toHours: number | null;
  multiplier: number;
};

export type CompanyLimitRule = {
  playerLevel: number;
  maxCompanies: number;
};

export type ActivityDefinition = {
  id: string;
  displayName: string;
  rewardMinor: number;
  cooldownSeconds: number;
  appliesTo: string;
};

export type ManagerDefinition = {
  id: string;
  displayName: string;
  description: string;
  hireCostMinor: number;
  salaryPerHourMinor: number;
  revenueMultiplier: number;
  expenseMultiplier: number;
  automatesTasks: boolean;
  appliesTo: string;
};

export type MarketEventDefinition = {
  id: string;
  displayName: string;
  revenueMultiplier: number;
  expenseMultiplier: number;
  durationHours: number;
  weight: number;
  affectsIndustryIds: string[];
};

export type AutomationLevelDefinition = {
  level: number;
  upgradeCostMinor: number;
  revenueMultiplier: number;
  expenseMultiplier: number;
};

export type LoanProductDefinition = {
  id: string;
  displayName: string;
  maxAmountMinor: number;
  interestRateHourly: number;
  durationHours: number;
};

export type UpgradeTrackDefinition = {
  id: string;
  displayName: string;
  maxLevel: number;
  revenueBonusPerLevel: number;
  expenseBonusPerLevel: number;
  baseCostMinor: number;
  costMultiplierPerLevel: number;
};

export type RankMilestoneDefinition = {
  rank: number;
  requiredSubsidiaries: number;
  requiredNetWorthMinor: number;
};

export type AcquisitionTargetDefinition = {
  id: string;
  displayName: string;
  costMinor: number;
  revenueBoostPerHourMinor: number;
  minBusinessRank: number;
  industryId: string;
};

export type IndustryDefinition = {
  id: string;
  displayName: string;
  startCostMinor: number;
  baseRevenuePerHourMinor: number;
  baseExpensesPerHourMinor: number;
  riskProfile: number;
  automationPotential: number;
  minBusinessRank: number;
  iconName: string;
  tagline: string;
  focusHint: string;
  accentColor: string;
  preferredTrackId: string | null;
};

export type EconomyConfig = {
  version: number;
  startingCashMinor: number;
  holdingCompanyCostMinor: number;
  subsidiaryCompanyCostMinor: number;
  maxOfflineHoursRewarded: number;
  lowCashThresholdMinor: number;
  maxActiveLoans: number;
  offlineEfficiency: OfflineEfficiencySegment[];
  companyLimits: CompanyLimitRule[];
  activities: ActivityDefinition[];
  managers: ManagerDefinition[];
  marketEvents: MarketEventDefinition[];
  automationLevels: AutomationLevelDefinition[];
  loanProducts: LoanProductDefinition[];
  upgradeTracks: UpgradeTrackDefinition[];
  rankMilestones: RankMilestoneDefinition[];
  acquisitionTargets: AcquisitionTargetDefinition[];
  industries: Record<string, IndustryDefinition>;
};

export function getMaxCompaniesForLevel(config: EconomyConfig, businessRank: number): number {
  let maxCompanies = 2;
  for (const rule of config.companyLimits) {
    if (businessRank >= rule.playerLevel) {
      maxCompanies = rule.maxCompanies;
    }
  }
  return maxCompanies;
}

export function getIndustry(config: EconomyConfig, industryId: string): IndustryDefinition | null {
  return config.industries[industryId] ?? null;
}

export function getIndustryFoundingCost(industry: IndustryDefinition, config: EconomyConfig): number {
  return industry.startCostMinor > 0 ? industry.startCostMinor : config.subsidiaryCompanyCostMinor;
}

export function getActivity(config: EconomyConfig, activityId: string): ActivityDefinition | null {
  return config.activities.find((a) => a.id === activityId) ?? null;
}

export function getManager(config: EconomyConfig, managerId: string): ManagerDefinition | null {
  return config.managers.find((m) => m.id === managerId) ?? null;
}

export function getAutomationLevel(
  config: EconomyConfig,
  level: number,
): AutomationLevelDefinition | null {
  return config.automationLevels.find((d) => d.level === level) ?? null;
}

export function getLoanProduct(config: EconomyConfig, productId: string): LoanProductDefinition | null {
  return config.loanProducts.find((p) => p.id === productId) ?? null;
}

export function getUpgradeTrack(config: EconomyConfig, trackId: string): UpgradeTrackDefinition | null {
  return config.upgradeTracks.find((t) => t.id === trackId) ?? null;
}

export function getActivitiesForKind(config: EconomyConfig, companyKind: string): ActivityDefinition[] {
  return config.activities.filter((a) => a.appliesTo === companyKind);
}

type RawConfig = {
  version?: number;
  starting_cash_minor?: number;
  holding_company_cost_minor?: number;
  subsidiary_company_cost_minor?: number;
  max_offline_hours_rewarded?: number;
  low_cash_threshold_minor?: number;
  max_active_loans?: number;
  offline_efficiency?: Array<{ from_hours: number; to_hours: number | null; multiplier: number }>;
  company_limits?: Array<{ player_level: number; max_companies: number }>;
  activities?: Array<{
    id: string;
    display_name: string;
    reward_minor: number;
    cooldown_seconds: number;
    applies_to: string;
  }>;
  managers?: Array<{
    id: string;
    display_name: string;
    description?: string;
    hire_cost_minor: number;
    salary_per_hour_minor: number;
    revenue_multiplier: number;
    expense_multiplier?: number;
    automates_tasks?: boolean;
    applies_to: string;
  }>;
  market_events?: Array<{
    id: string;
    display_name: string;
    revenue_multiplier: number;
    expense_multiplier: number;
    duration_hours: number;
    weight: number;
    affects_industry_ids: string[];
  }>;
  automation_levels?: Array<{
    level: number;
    upgrade_cost_minor: number;
    revenue_multiplier: number;
    expense_multiplier: number;
  }>;
  loan_products?: Array<{
    id: string;
    display_name: string;
    max_amount_minor: number;
    interest_rate_hourly: number;
    duration_hours: number;
  }>;
  upgrade_tracks?: Array<{
    id: string;
    display_name: string;
    max_level: number;
    revenue_bonus_per_level: number;
    expense_bonus_per_level: number;
    base_cost_minor: number;
    cost_multiplier_per_level: number;
  }>;
  rank_milestones?: Array<{
    rank: number;
    required_subsidiaries: number;
    required_net_worth_minor: number;
  }>;
  acquisition_targets?: Array<{
    id: string;
    display_name: string;
    cost_minor: number;
    revenue_boost_per_hour_minor: number;
    min_business_rank: number;
    industry_id: string;
  }>;
  industries?: Array<{
    id: string;
    display_name: string;
    start_cost_minor: number;
    base_revenue_per_hour_minor: number;
    base_expenses_per_hour_minor: number;
    risk_profile: number;
    automation_potential: number;
    min_business_rank: number;
    icon_name?: string;
    tagline?: string;
    focus_hint?: string;
    accent_color?: string;
    preferred_track_id?: string;
  }>;
};

export function parseEconomyConfig(data: RawConfig): EconomyConfig {
  const industries: Record<string, IndustryDefinition> = {};
  for (const industry of data.industries ?? []) {
    industries[industry.id] = {
      id: industry.id,
      displayName: industry.display_name,
      startCostMinor: industry.start_cost_minor,
      baseRevenuePerHourMinor: industry.base_revenue_per_hour_minor,
      baseExpensesPerHourMinor: industry.base_expenses_per_hour_minor,
      riskProfile: industry.risk_profile,
      automationPotential: industry.automation_potential,
      minBusinessRank: industry.min_business_rank,
      iconName: industry.icon_name ?? 'business',
      tagline: industry.tagline ?? '',
      focusHint: industry.focus_hint ?? '',
      accentColor: industry.accent_color ?? '',
      preferredTrackId: industry.preferred_track_id ?? null,
    };
  }

  return {
    version: data.version ?? 1,
    startingCashMinor: data.starting_cash_minor ?? 5_000_000,
    holdingCompanyCostMinor: data.holding_company_cost_minor ?? 2_500_000,
    subsidiaryCompanyCostMinor: data.subsidiary_company_cost_minor ?? 2_500_000,
    maxOfflineHoursRewarded: data.max_offline_hours_rewarded ?? 720,
    lowCashThresholdMinor: data.low_cash_threshold_minor ?? 500_000,
    maxActiveLoans: data.max_active_loans ?? 2,
    offlineEfficiency: (data.offline_efficiency ?? []).map((s) => ({
      fromHours: s.from_hours,
      toHours: s.to_hours,
      multiplier: s.multiplier,
    })),
    companyLimits: (data.company_limits ?? []).map((r) => ({
      playerLevel: r.player_level,
      maxCompanies: r.max_companies,
    })),
    activities: (data.activities ?? []).map((a) => ({
      id: a.id,
      displayName: a.display_name,
      rewardMinor: a.reward_minor,
      cooldownSeconds: a.cooldown_seconds,
      appliesTo: a.applies_to,
    })),
    managers: (data.managers ?? []).map((m) => ({
      id: m.id,
      displayName: m.display_name,
      description: m.description ?? '',
      hireCostMinor: m.hire_cost_minor,
      salaryPerHourMinor: m.salary_per_hour_minor,
      revenueMultiplier: m.revenue_multiplier,
      expenseMultiplier: m.expense_multiplier ?? 1,
      automatesTasks: m.automates_tasks ?? false,
      appliesTo: m.applies_to,
    })),
    marketEvents: (data.market_events ?? []).map((e) => ({
      id: e.id,
      displayName: e.display_name,
      revenueMultiplier: e.revenue_multiplier,
      expenseMultiplier: e.expense_multiplier,
      durationHours: e.duration_hours,
      weight: e.weight,
      affectsIndustryIds: e.affects_industry_ids ?? [],
    })),
    automationLevels: (data.automation_levels ?? []).map((l) => ({
      level: l.level,
      upgradeCostMinor: l.upgrade_cost_minor,
      revenueMultiplier: l.revenue_multiplier,
      expenseMultiplier: l.expense_multiplier,
    })),
    loanProducts: (data.loan_products ?? []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      maxAmountMinor: p.max_amount_minor,
      interestRateHourly: p.interest_rate_hourly,
      durationHours: p.duration_hours,
    })),
    upgradeTracks: (data.upgrade_tracks ?? []).map((t) => ({
      id: t.id,
      displayName: t.display_name,
      maxLevel: t.max_level,
      revenueBonusPerLevel: t.revenue_bonus_per_level,
      expenseBonusPerLevel: t.expense_bonus_per_level,
      baseCostMinor: t.base_cost_minor,
      costMultiplierPerLevel: t.cost_multiplier_per_level,
    })),
    rankMilestones: (data.rank_milestones ?? []).map((m) => ({
      rank: m.rank,
      requiredSubsidiaries: m.required_subsidiaries,
      requiredNetWorthMinor: m.required_net_worth_minor,
    })),
    acquisitionTargets: (data.acquisition_targets ?? []).map((t) => ({
      id: t.id,
      displayName: t.display_name,
      costMinor: t.cost_minor,
      revenueBoostPerHourMinor: t.revenue_boost_per_hour_minor,
      minBusinessRank: t.min_business_rank,
      industryId: t.industry_id,
    })),
    industries,
  };
}
