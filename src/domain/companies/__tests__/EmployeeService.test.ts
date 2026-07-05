import {
  adjustEmployeeCount,
  employeeRevenuePerHourMinor,
  marginalEmployeeProfitMinor,
  maxEmployeesForLevel,
  setPayrollLevel,
} from '@/domain/companies/EmployeeService';
import { createAppState } from '@/domain/core/AppState';
import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { MoneyValue } from '@/domain/money/MoneyValue';

function makeSubsidiary(level = 1, employeeCount = 1, payrollLevel = 1) {
  return {
    id: 'co-1',
    name: 'Test Co',
    companyKind: CompanyKinds.SUBSIDIARY,
    industryId: 'cafe',
    level,
    cashBalance: MoneyValue.zero(),
    reputation: 0,
    automationLevel: 0,
    executiveContracts: {},
    activeEffects: [],
    lifetimeProfitMinor: 0,
    employeeCount,
    payrollLevel,
    revenuePerHour: MoneyValue.fromMinor(100_000),
    expensesPerHour: MoneyValue.fromMinor(60_000),
    riskLevel: 0.2,
    upgradeTrackLevels: {},
    createdAtUnix: 0,
    updatedAtUnix: 0,
  };
}

describe('EmployeeService', () => {
  it('increases revenue with more employees up to a point', () => {
    const low = employeeRevenuePerHourMinor(2, 1, 2);
    const high = employeeRevenuePerHourMinor(8, 1, 2);
    expect(high).toBeGreaterThan(low);
    expect(high / low).toBeLessThan(4);
  });

  it('penalizes overstaffing relative to company level', () => {
    const optimal = employeeRevenuePerHourMinor(4, 1, 2);
    const overstaffed = employeeRevenuePerHourMinor(10, 1, 2);
    expect(overstaffed / 10).toBeLessThan(optimal / 4);
  });

  it('adjusts employee count within level cap', () => {
    const state = createAppState();
    state.companies.push(makeSubsidiary(2, 1, 1));
    const result = adjustEmployeeCount(state, 'co-1', 1, 100);
    expect(result.success).toBe(true);
    expect(state.companies[0]?.employeeCount).toBe(2);
    expect(maxEmployeesForLevel(2)).toBe(8);
  });

  it('rejects hiring beyond cap', () => {
    const state = createAppState();
    state.companies.push(makeSubsidiary(1, maxEmployeesForLevel(1), 1));
    const result = adjustEmployeeCount(state, 'co-1', 1, 100);
    expect(result.success).toBe(false);
  });

  it('reports negative marginal profit when overstaffed', () => {
    const marginal = marginalEmployeeProfitMinor(12, 2, 2);
    expect(marginal).toBeLessThan(0);
  });

  it('updates payroll level within bounds', () => {
    const state = createAppState();
    state.companies.push(makeSubsidiary());
    const okResult = setPayrollLevel(state, 'co-1', 3, 100);
    expect(okResult.success).toBe(true);
    expect(state.companies[0]?.payrollLevel).toBe(3);

    const badResult = setPayrollLevel(state, 'co-1', 9, 100);
    expect(badResult.success).toBe(false);
  });
});
