/** Stable analytics event names — keep in sync with docs/ANALYTICS.md */
export const AnalyticsEventIds = {
  sessionStart: 'session_start',
  sessionEnd: 'session_end',
  holdingCreated: 'holding_created',
  subsidiaryCreated: 'subsidiary_created',
  firstSubsidiaryCreated: 'first_subsidiary_created',
  activityPerformed: 'activity_performed',
  managerHired: 'manager_hired',
  automationUpgraded: 'automation_upgraded',
  loanTaken: 'loan_taken',
  loanRepaid: 'loan_repaid',
  offlineSummaryShown: 'offline_summary_shown',
  marketEventStarted: 'market_event_started',
  crashContext: 'crash_context',
} as const;

export type AnalyticsEventId = (typeof AnalyticsEventIds)[keyof typeof AnalyticsEventIds];
