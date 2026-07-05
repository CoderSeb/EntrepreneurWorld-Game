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

export const DEFAULT_TARGETS: MilestoneTargets = {
  firstSubsidiaryMinutes: [1, 3],
  firstUpgradeMinutes: [3, 7],
  firstExecutiveMinutes: [15, 30],
  rank5Minutes: [30, 60],
};
