import {
  EconomyConfig,
  getAutomationLevel,
  getIndustry,
  getLoanProduct,
  getManager,
} from '@/domain/config/EconomyConfig';
import { AppState, findCompany } from '@/domain/core/AppState';
import { CompanyState, isHolding } from '@/domain/core/CompanyState';
import { fail, ok, OperationResult } from '@/domain/core/OperationResult';
import { newId } from '@/domain/core/IdGenerator';
import { LoanState } from '@/domain/core/LoanState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import {
  findHoldingCompany,
  tryDeductForSubsidiaryExpense,
  tryDeductFromHolding,
} from '@/domain/treasury/CompanyTreasury';
import { applyRankIfImproved } from '@/domain/progression/ProgressionService';
import {
  EXECUTIVE_CONTRACT_HOURS,
  getExecutiveHireCostMinor,
  isExecutiveHired,
} from '@/domain/companies/ExecutiveContracts';
import { effectiveLoanTerms } from '@/domain/companies/LoanPricingService';
import {
  getMaxSystemsLevel,
  getNextSystemsUpgradeCostMinor,
} from '@/domain/companies/SystemsService';

export function hireExecutiveRole(
  appState: AppState,
  config: EconomyConfig,
  companyId: string,
  roleId: string,
  nowUnix: number,
): OperationResult<CompanyState> {
  const company = findCompany(appState, companyId);
  if (!company) {
    return fail('company_not_found', 'Company not found');
  }
  if (isHolding(company)) {
    return fail('invalid_company_kind', 'Executives cannot be assigned to holding companies');
  }
  if (isExecutiveHired(company, roleId, nowUnix)) {
    return fail('executive_already_hired', 'This role is already filled at the company');
  }

  const role = getManager(config, roleId);
  if (!role) {
    return fail('unknown_executive_role', 'Executive role not found');
  }
  if (role.appliesTo !== company.companyKind) {
    return fail('invalid_executive_target', 'Executive role cannot be assigned to this company');
  }

  const hireCost = MoneyValue.fromMinor(getExecutiveHireCostMinor(company, role));
  if (!tryDeductForSubsidiaryExpense(appState, company, hireCost.amountMinorUnits)) {
    return fail('insufficient_funds', 'Not enough company or holding cash to hire executive');
  }
  company.executiveContracts[roleId] = {
    expiresAtUnix: nowUnix + EXECUTIVE_CONTRACT_HOURS * 3600,
  };
  company.updatedAtUnix = nowUnix;
  applyRankIfImproved(appState, config);
  return ok(company);
}

export function upgradeAutomation(
  appState: AppState,
  config: EconomyConfig,
  companyId: string,
  nowUnix: number,
): OperationResult<CompanyState> {
  const company = findCompany(appState, companyId);
  if (!company) {
    return fail('company_not_found', 'Company not found');
  }
  if (isHolding(company)) {
    return fail('invalid_company_kind', 'Systems upgrades apply to subsidiaries only');
  }

  const industry = getIndustry(config, company.industryId);
  if (!industry) {
    return fail('unknown_industry', 'Industry not found');
  }

  const maxLevel = getMaxSystemsLevel(industry, config);
  if (company.automationLevel >= maxLevel) {
    return fail('automation_maxed', 'Systems are already at max level for this industry');
  }

  const nextLevel = company.automationLevel + 1;
  const definition = getAutomationLevel(config, nextLevel);
  if (!definition) {
    return fail('automation_maxed', 'Systems are already at max level');
  }

  const costMinor = getNextSystemsUpgradeCostMinor(company, industry, config);
  if (costMinor === null) {
    return fail('automation_maxed', 'Systems are already at max level');
  }

  const cost = MoneyValue.fromMinor(costMinor);
  if (!tryDeductForSubsidiaryExpense(appState, company, cost.amountMinorUnits)) {
    return fail('insufficient_funds', 'Not enough company or holding cash for automation upgrade');
  }
  company.automationLevel = nextLevel;
  company.updatedAtUnix = nowUnix;
  applyRankIfImproved(appState, config);
  return ok(company);
}

export function takeLoan(
  appState: AppState,
  config: EconomyConfig,
  productId: string,
  amountMinor: number,
  nowUnix: number,
): OperationResult<LoanState> {
  if (appState.player.activeLoans.length >= config.maxActiveLoans) {
    return fail('loan_limit_reached', 'Maximum number of active loans reached');
  }

  const product = getLoanProduct(config, productId);
  if (!product) {
    return fail('unknown_loan_product', 'Loan product not found');
  }

  const terms = effectiveLoanTerms(product, appState.player.businessRank);
  if (amountMinor <= 0 || amountMinor > terms.maxAmountMinor) {
    return fail('invalid_loan_amount', 'Loan amount is outside allowed range for your rank');
  }

  const loan: LoanState = {
    id: newId('loan'),
    productId: product.id,
    principalMinor: amountMinor,
    remainingMinor: amountMinor,
    interestRateHourly: terms.hourlyRate,
    takenAtUnix: nowUnix,
    dueAtUnix: nowUnix + product.durationHours * 3600,
  };

  appState.player.activeLoans.push(loan);
  const holding = findHoldingCompany(appState);
  if (holding) {
    holding.cashBalance = holding.cashBalance.add(MoneyValue.fromMinor(amountMinor));
  } else {
    appState.player.personalCashBalance = appState.player.personalCashBalance.add(
      MoneyValue.fromMinor(amountMinor),
    );
  }
  return ok(loan);
}

export function repayLoan(
  appState: AppState,
  loanId: string,
): OperationResult<MoneyValue> {
  const loan = appState.player.activeLoans.find((l) => l.id === loanId);
  if (!loan) {
    return fail('loan_not_found', 'Loan not found');
  }

  const payoff = MoneyValue.fromMinor(loan.remainingMinor);
  if (!tryDeductFromHolding(appState, payoff.amountMinorUnits)) {
    return fail('insufficient_funds', 'Not enough holding treasury cash to repay loan');
  }
  appState.player.activeLoans = appState.player.activeLoans.filter((l) => l.id !== loanId);
  return ok(payoff);
}

export function accrueLoanInterest(appState: AppState, deltaSeconds: number): void {
  if (appState.player.activeLoans.length === 0) {
    return;
  }

  const hours = deltaSeconds / 3600;
  for (const loan of appState.player.activeLoans) {
    const interest = Math.round(loan.remainingMinor * loan.interestRateHourly * hours);
    loan.remainingMinor += Math.max(0, interest);
  }
}

