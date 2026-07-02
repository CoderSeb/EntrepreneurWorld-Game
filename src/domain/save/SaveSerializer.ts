import { CompanyKinds } from '@/domain/core/CompanyKinds';
import { CompanyState } from '@/domain/core/CompanyState';
import { LoanState } from '@/domain/core/LoanState';
import { PlayerState, createPlayerState } from '@/domain/core/PlayerState';
import { PurchaseState, createPurchaseState } from '@/domain/core/PurchaseState';
import { SaveData, CURRENT_SCHEMA_VERSION } from '@/domain/save/SaveData';
import { MoneyValue } from '@/domain/money/MoneyValue';

function unixToIso(unixTime: number): string {
  if (unixTime <= 0) {
    return '';
  }
  return new Date(unixTime * 1000).toISOString();
}

function isoToUnix(isoText: string): number {
  if (!isoText) {
    return 0;
  }
  const normalized = isoText.endsWith('Z') ? isoText : `${isoText}Z`;
  return Math.floor(new Date(normalized).getTime() / 1000);
}

function nullableIsoToUnix(value: unknown): number {
  if (value === null || value === undefined) {
    return -1;
  }
  return isoToUnix(String(value));
}

function playerToDict(player: PlayerState): Record<string, unknown> {
  return {
    player_id: player.playerId,
    cash_balance_minor: player.cashBalance.amountMinorUnits,
    business_rank: player.businessRank,
    max_companies: player.maxCompanies,
    holding_company_id: player.holdingCompanyId,
    onboarding_completed: player.onboardingCompleted,
    active_loans: player.activeLoans.map((loan) => ({
      id: loan.id,
      product_id: loan.productId,
      principal_minor: loan.principalMinor,
      remaining_minor: loan.remainingMinor,
      interest_rate_hourly: loan.interestRateHourly,
      due_at_unix: loan.dueAtUnix,
      taken_at_unix: loan.takenAtUnix,
    })),
  };
}

function loanFromDict(payload: Record<string, unknown>): LoanState {
  return {
    id: String(payload.id ?? ''),
    productId: String(payload.product_id ?? ''),
    principalMinor: Number(payload.principal_minor ?? 0),
    remainingMinor: Number(payload.remaining_minor ?? 0),
    interestRateHourly: Number(payload.interest_rate_hourly ?? 0),
    dueAtUnix: Number(payload.due_at_unix ?? 0),
    takenAtUnix: Number(payload.taken_at_unix ?? 0),
  };
}

function playerFromDict(payload: Record<string, unknown>): PlayerState {
  const player = createPlayerState();
  player.playerId = String(payload.player_id ?? '');
  player.cashBalance = MoneyValue.fromMinor(Number(payload.cash_balance_minor ?? 0));
  player.businessRank = Number(payload.business_rank ?? 1);
  player.maxCompanies = Number(payload.max_companies ?? 3);
  player.holdingCompanyId = String(payload.holding_company_id ?? '');
  player.onboardingCompleted = Boolean(payload.onboarding_completed ?? false);
  player.activeLoans = ((payload.active_loans as Record<string, unknown>[]) ?? []).map(loanFromDict);
  return player;
}

function companyToDict(company: CompanyState): Record<string, unknown> {
  return {
    id: company.id,
    name: company.name,
    company_kind: company.companyKind,
    industry_id: company.industryId,
    level: company.level,
    cash_balance_minor: company.cashBalance.amountMinorUnits,
    reputation: company.reputation,
    automation_level: company.automationLevel,
    executive_hires: { ...company.executiveHires },
    lifetime_profit_minor: company.lifetimeProfitMinor,
    employee_count: company.employeeCount,
    revenue_per_hour_minor: company.revenuePerHour.amountMinorUnits,
    expenses_per_hour_minor: company.expensesPerHour.amountMinorUnits,
    risk_level: company.riskLevel,
    upgrade_track_levels: { ...company.upgradeTrackLevels },
    created_at_unix: company.createdAtUnix,
    updated_at_unix: company.updatedAtUnix,
  };
}

function readExecutiveHires(payload: Record<string, unknown>): Record<string, boolean> {
  const hires = (payload.executive_hires as Record<string, boolean> | undefined) ?? {};
  const legacyManager = String(payload.manager_id ?? '');
  if (legacyManager && !hires[legacyManager]) {
    return { ...hires, [legacyManager]: true };
  }
  return { ...hires };
}

function companyFromDict(payload: Record<string, unknown>): CompanyState {
  return {
    id: String(payload.id ?? ''),
    name: String(payload.name ?? ''),
    companyKind: String(payload.company_kind ?? CompanyKinds.SUBSIDIARY) as CompanyState['companyKind'],
    industryId: String(payload.industry_id ?? ''),
    level: Number(payload.level ?? 1),
    cashBalance: MoneyValue.fromMinor(Number(payload.cash_balance_minor ?? 0)),
    reputation: Number(payload.reputation ?? 0),
    automationLevel: Number(payload.automation_level ?? 0),
    executiveHires: readExecutiveHires(payload),
    lifetimeProfitMinor: Number(payload.lifetime_profit_minor ?? 0),
    employeeCount: Number(payload.employee_count ?? 0),
    revenuePerHour: MoneyValue.fromMinor(Number(payload.revenue_per_hour_minor ?? 0)),
    expensesPerHour: MoneyValue.fromMinor(Number(payload.expenses_per_hour_minor ?? 0)),
    riskLevel: Number(payload.risk_level ?? 0),
    upgradeTrackLevels: { ...(payload.upgrade_track_levels as Record<string, number>) },
    createdAtUnix: Number(payload.created_at_unix ?? 0),
    updatedAtUnix: Number(payload.updated_at_unix ?? 0),
  };
}

function purchasesToDict(purchases: PurchaseState): Record<string, unknown> {
  return {
    entitlements: [...purchases.entitlements],
    last_validated_at_unix: purchases.lastValidatedAtUnix,
  };
}

function purchasesFromDict(payload: Record<string, unknown>): PurchaseState {
  const purchases = createPurchaseState();
  for (const entitlementId of (payload.entitlements as string[]) ?? []) {
    purchases.entitlements.push(String(entitlementId));
  }
  purchases.lastValidatedAtUnix = Number(payload.last_validated_at_unix ?? 0);
  return purchases;
}

export function saveDataToDictionary(saveData: SaveData): Record<string, unknown> {
  return {
    schema_version: saveData.schemaVersion,
    player_id: saveData.playerId,
    created_at: unixToIso(saveData.createdAtUnix),
    last_seen_at: unixToIso(saveData.lastSeenAtUnix),
    last_server_seen_at:
      saveData.lastServerSeenAtUnix < 0 ? null : unixToIso(saveData.lastServerSeenAtUnix),
    economy_version: saveData.economyVersion,
    client_version: saveData.clientVersion,
    state: {
      player: playerToDict(saveData.player),
      companies: saveData.companies.map(companyToDict),
      market: saveData.marketState,
      activity_cooldowns: saveData.activityCooldowns,
      purchases: purchasesToDict(saveData.purchases),
      settings: saveData.settings,
    },
    integrity: {
      checksum: saveData.checksum,
      signature_version: saveData.signatureVersion,
    },
  };
}

export function saveDataFromDictionary(payload: Record<string, unknown>): SaveData {
  const state = (payload.state as Record<string, unknown>) ?? {};
  const integrity = (payload.integrity as Record<string, unknown>) ?? {};

  return {
    schemaVersion: Number(payload.schema_version ?? CURRENT_SCHEMA_VERSION),
    playerId: String(payload.player_id ?? ''),
    createdAtUnix: isoToUnix(String(payload.created_at ?? '')),
    lastSeenAtUnix: isoToUnix(String(payload.last_seen_at ?? '')),
    lastServerSeenAtUnix: nullableIsoToUnix(payload.last_server_seen_at),
    economyVersion: Number(payload.economy_version ?? 1),
    clientVersion: String(payload.client_version ?? '0.1.0'),
    player: playerFromDict((state.player as Record<string, unknown>) ?? {}),
    companies: ((state.companies as Record<string, unknown>[]) ?? []).map(companyFromDict),
    marketState: (state.market as Record<string, unknown>) ?? {},
    activityCooldowns: (state.activity_cooldowns as Record<string, number>) ?? {},
    purchases: purchasesFromDict((state.purchases as Record<string, unknown>) ?? {}),
    settings: (state.settings as Record<string, unknown>) ?? {},
    checksum: String(integrity.checksum ?? ''),
    signatureVersion: Number(integrity.signature_version ?? 1),
  };
}
