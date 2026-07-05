import { IndustryDefinition } from '@/domain/config/EconomyConfig';
import { CompanyState } from '@/domain/core/CompanyState';
import { fail, ok, OperationResult } from '@/domain/core/OperationResult';
import { AppState, findCompany } from '@/domain/core/AppState';
import { isHolding } from '@/domain/core/CompanyState';

export const BASE_REVENUE_PER_EMPLOYEE_MINOR = 850;
export const BASE_SALARY_PER_EMPLOYEE_MINOR = 550;
export const MIN_PAYROLL_LEVEL = 1;
export const MAX_PAYROLL_LEVEL = 5;
export const STARTING_EMPLOYEES = 1;

export function maxEmployeesForLevel(level: number): number {
  return level * 3 + 2;
}

export function employeeRevenuePerHourMinor(employeeCount: number, payrollLevel: number, companyLevel: number): number {
  if (employeeCount <= 0) {
    return 0;
  }

  const optimal = Math.max(1, companyLevel * 2);
  const overstaffed = Math.max(0, employeeCount - optimal);
  const efficiency = Math.max(0.35, 1 - overstaffed * 0.06);
  const payrollBoost = 1 + (payrollLevel - 1) * 0.08;

  return Math.round(employeeCount * BASE_REVENUE_PER_EMPLOYEE_MINOR * efficiency * payrollBoost);
}

export function employeePayrollPerHourMinor(employeeCount: number, payrollLevel: number): number {
  if (employeeCount <= 0) {
    return 0;
  }

  return Math.round(employeeCount * BASE_SALARY_PER_EMPLOYEE_MINOR * payrollLevel);
}

export function payrollLevelRevenueBonusPercent(payrollLevel: number): number {
  return Math.max(0, payrollLevel - 1) * 8;
}

export function marginalEmployeeProfitMinor(
  employeeCount: number,
  payrollLevel: number,
  companyLevel: number,
): number {
  const nextRevenue = employeeRevenuePerHourMinor(employeeCount + 1, payrollLevel, companyLevel);
  const currentRevenue = employeeRevenuePerHourMinor(employeeCount, payrollLevel, companyLevel);
  const addedPayroll = BASE_SALARY_PER_EMPLOYEE_MINOR * payrollLevel;
  return nextRevenue - currentRevenue - addedPayroll;
}

export function adjustEmployeeCount(
  appState: AppState,
  companyId: string,
  delta: number,
  nowUnix: number,
): OperationResult<CompanyState> {
  const company = findCompany(appState, companyId);
  if (!company) {
    return fail('company_not_found', 'Company not found');
  }
  if (isHolding(company)) {
    return fail('invalid_company_kind', 'Employees apply to subsidiaries only');
  }

  const nextCount = company.employeeCount + delta;
  if (nextCount < 0) {
    return fail('employee_count_too_low', 'Cannot reduce employees below zero');
  }

  const maxEmployees = maxEmployeesForLevel(company.level);
  if (nextCount > maxEmployees) {
    return fail('employee_limit_reached', `Maximum ${maxEmployees} employees at company level ${company.level}`);
  }

  company.employeeCount = nextCount;
  company.updatedAtUnix = nowUnix;
  return ok(company);
}

export function setPayrollLevel(
  appState: AppState,
  companyId: string,
  payrollLevel: number,
  nowUnix: number,
): OperationResult<CompanyState> {
  const company = findCompany(appState, companyId);
  if (!company) {
    return fail('company_not_found', 'Company not found');
  }
  if (isHolding(company)) {
    return fail('invalid_company_kind', 'Payroll applies to subsidiaries only');
  }

  const nextLevel = Math.round(payrollLevel);
  if (nextLevel < MIN_PAYROLL_LEVEL || nextLevel > MAX_PAYROLL_LEVEL) {
    return fail('invalid_payroll_level', `Payroll level must be ${MIN_PAYROLL_LEVEL}-${MAX_PAYROLL_LEVEL}`);
  }

  company.payrollLevel = nextLevel;
  company.updatedAtUnix = nowUnix;
  return ok(company);
}

export function startingEmployeesForIndustry(_industry: IndustryDefinition): number {
  return STARTING_EMPLOYEES;
}
