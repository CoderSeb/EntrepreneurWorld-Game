import {
  CompanyEconomyBreakdown,
  EconomyBreakdownLine,
  EconomyBreakdownLineUi,
} from '@/domain/economy/EconomyBreakdownService';

export type RealisticBreakdownCategoryId =
  | 'operating_sales'
  | 'growth_investments'
  | 'leadership_impact'
  | 'market_and_synergy'
  | 'campaigns_revenue'
  | 'industry_adjustments'
  | 'operating_overhead'
  | 'staff_salaries'
  | 'executive_compensation'
  | 'management_overhead'
  | 'management_savings'
  | 'market_conditions'
  | 'campaign_costs'
  | 'financing_costs';

type CategorySpec = {
  id: RealisticBreakdownCategoryId;
  kind: 'revenue' | 'expense';
  lineIds?: string[];
  idPrefix?: string;
  isCredit?: boolean;
};

const REVENUE_CATEGORIES: CategorySpec[] = [
  {
    id: 'operating_sales',
    kind: 'revenue',
    lineIds: ['base_revenue', 'employee_revenue'],
  },
  {
    id: 'growth_investments',
    kind: 'revenue',
    lineIds: ['automation_revenue', 'preferred_track_revenue', 'upgrade_tracks_revenue'],
  },
  { id: 'leadership_impact', kind: 'revenue', idPrefix: 'executive_revenue_' },
  { id: 'market_and_synergy', kind: 'revenue', lineIds: ['market_revenue', 'portfolio_revenue'] },
  { id: 'campaigns_revenue', kind: 'revenue', lineIds: ['activity_revenue', 'policy_revenue'] },
  {
    id: 'industry_adjustments',
    kind: 'revenue',
    lineIds: [
      'retention_revenue',
      'vacancy_revenue',
      'leverage_revenue',
      'capacity_cap_revenue',
      'inventory_cap_revenue',
    ],
  },
];

const EXPENSE_CATEGORIES: CategorySpec[] = [
  {
    id: 'operating_overhead',
    kind: 'expense',
    lineIds: ['base_expenses', 'automation_expenses', 'upgrade_tracks_expenses'],
  },
  { id: 'staff_salaries', kind: 'expense', lineIds: ['employee_payroll'] },
  { id: 'executive_compensation', kind: 'expense', idPrefix: 'executive_salary_' },
  { id: 'market_conditions', kind: 'expense', lineIds: ['market_expenses'] },
  { id: 'campaign_costs', kind: 'expense', lineIds: ['activity_expenses', 'policy_expenses'] },
  { id: 'financing_costs', kind: 'expense', lineIds: ['leverage_interest', 'integration_debt'] },
];

function matchesLine(line: EconomyBreakdownLine, spec: CategorySpec): boolean {
  if (line.kind !== spec.kind) {
    return false;
  }
  if (spec.lineIds?.includes(line.id)) {
    return true;
  }
  if (spec.idPrefix && line.id.startsWith(spec.idPrefix)) {
    return true;
  }
  return false;
}

function sumCategory(lines: EconomyBreakdownLine[], spec: CategorySpec): number {
  return lines.filter((line) => matchesLine(line, spec)).reduce((sum, line) => sum + line.amountMinorPerHour, 0);
}

function sumExecutiveExpenseEffects(lines: EconomyBreakdownLine[]): number {
  return lines
    .filter((line) => line.kind === 'expense' && line.id.startsWith('executive_expense_'))
    .reduce((sum, line) => sum + line.amountMinorPerHour, 0);
}

export type PresentedEconomyBreakdown = {
  revenueLines: EconomyBreakdownLineUi[];
  expenseLines: EconomyBreakdownLineUi[];
  grossRevenueMinorPerHour: number;
  totalExpensesMinorPerHour: number;
  netMinorPerHour: number;
};

export function presentRealisticEconomyBreakdown(
  breakdown: CompanyEconomyBreakdown,
  getLabel: (categoryId: RealisticBreakdownCategoryId) => string,
): PresentedEconomyBreakdown {
  const revenueLines: EconomyBreakdownLineUi[] = [];

  for (const spec of REVENUE_CATEGORIES) {
    const amountMinorPerHour = sumCategory(breakdown.lines, spec);
    if (amountMinorPerHour === 0) {
      continue;
    }
    revenueLines.push({
      id: spec.id,
      kind: 'revenue',
      amountMinorPerHour,
      label: getLabel(spec.id),
    });
  }

  const expenseLines: EconomyBreakdownLineUi[] = [];

  for (const spec of EXPENSE_CATEGORIES) {
    const amountMinorPerHour = sumCategory(breakdown.lines, spec);
    if (amountMinorPerHour === 0) {
      continue;
    }
    expenseLines.push({
      id: spec.id,
      kind: 'expense',
      amountMinorPerHour,
      label: getLabel(spec.id),
    });
  }

  const managementEffects = sumExecutiveExpenseEffects(breakdown.lines);
  if (managementEffects > 0) {
    expenseLines.push({
      id: 'management_overhead',
      kind: 'expense',
      amountMinorPerHour: managementEffects,
      label: getLabel('management_overhead'),
    });
  } else if (managementEffects < 0) {
    expenseLines.push({
      id: 'management_savings',
      kind: 'expense',
      amountMinorPerHour: -managementEffects,
      label: getLabel('management_savings'),
      isCredit: true,
    });
  }

  return {
    revenueLines,
    expenseLines,
    grossRevenueMinorPerHour: breakdown.grossRevenueMinorPerHour,
    totalExpensesMinorPerHour: breakdown.totalExpensesMinorPerHour,
    netMinorPerHour: breakdown.netMinorPerHour,
  };
}
