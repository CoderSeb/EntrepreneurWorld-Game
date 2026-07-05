import type { TranslationDictionary } from '@/i18n/types';

const BREAKDOWN_LABELS: Record<string, keyof TranslationDictionary['economyBreakdown']> = {
  base_revenue: 'baseRevenue',
  employee_revenue: 'employeeRevenue',
  automation_revenue: 'automationRevenue',
  preferred_track_revenue: 'preferredTrackRevenue',
  upgrade_tracks_revenue: 'upgradeTracksRevenue',
  portfolio_revenue: 'portfolioRevenue',
  market_revenue: 'marketRevenue',
  activity_revenue: 'activityRevenue',
  retention_revenue: 'retentionRevenue',
  vacancy_revenue: 'vacancyRevenue',
  leverage_revenue: 'leverageRevenue',
  capacity_cap_revenue: 'capacityCapRevenue',
  inventory_cap_revenue: 'inventoryCapRevenue',
  policy_revenue: 'policyRevenue',
  base_expenses: 'baseExpenses',
  employee_payroll: 'employeePayroll',
  automation_expenses: 'automationExpenses',
  upgrade_tracks_expenses: 'upgradeTracksExpenses',
  market_expenses: 'marketExpenses',
  activity_expenses: 'activityExpenses',
  policy_expenses: 'policyExpenses',
  leverage_interest: 'leverageInterest',
  integration_debt: 'integrationDebt',
};

export function getEconomyBreakdownLabel(
  lineId: string,
  translations: TranslationDictionary,
): string {
  const executiveRevenue = lineId.match(/^executive_revenue_(.+)$/);
  if (executiveRevenue) {
    return `${translations.economyBreakdown.executiveRevenue} (${executiveRevenue[1]})`;
  }

  const executiveSalary = lineId.match(/^executive_salary_(.+)$/);
  if (executiveSalary) {
    return `${translations.economyBreakdown.executiveSalary} (${executiveSalary[1]})`;
  }

  const executiveExpense = lineId.match(/^executive_expense_(.+)$/);
  if (executiveExpense) {
    return `${translations.economyBreakdown.executiveExpense} (${executiveExpense[1]})`;
  }

  const mapped = BREAKDOWN_LABELS[lineId];
  if (mapped) {
    return translations.economyBreakdown[mapped];
  }

  return lineId.replace(/_/g, ' ');
}

export function formatBottleneckHint(
  hint: string | null,
  translations: TranslationDictionary,
  formatMoney: (minor: number) => string,
): string | null {
  if (!hint) {
    return null;
  }

  const capacityMatch = hint.match(/^capacity_cap_(\d+)$/);
  if (capacityMatch) {
    return translations.bottlenecks.capacityCap.replace(
      '{cap}',
      formatMoney(Number(capacityMatch[1])),
    );
  }

  const inventoryMatch = hint.match(/^inventory_cap_(\d+)$/);
  if (inventoryMatch) {
    return translations.bottlenecks.inventoryCap.replace(
      '{cap}',
      formatMoney(Number(inventoryMatch[1])),
    );
  }

  const retentionMatch = hint.match(/^retention_(\d+)$/);
  if (retentionMatch) {
    return translations.bottlenecks.retention.replace('{percent}', retentionMatch[1]);
  }

  const leverageMatch = hint.match(/^leverage_occupancy_(\d+)_interest_(\d+)$/);
  if (leverageMatch) {
    return translations.bottlenecks.leverage
      .replace('{occupancy}', leverageMatch[1])
      .replace('{interest}', formatMoney(Number(leverageMatch[2])));
  }

  return hint;
}
