import { CompanyKinds } from '@/domain/core/CompanyKinds';

export const CURRENT_SCHEMA_VERSION = 7;

export type SaveData = {
  schemaVersion: number;
  playerId: string;
  createdAtUnix: number;
  lastSeenAtUnix: number;
  lastServerSeenAtUnix: number;
  economyVersion: number;
  clientVersion: string;
  player: import('@/domain/core/PlayerState').PlayerState;
  companies: import('@/domain/core/CompanyState').CompanyState[];
  marketState: Record<string, unknown>;
  activityCooldowns: Record<string, number>;
  purchases: import('@/domain/core/PurchaseState').PurchaseState;
  settings: Record<string, unknown>;
  checksum: string;
  signatureVersion: number;
};

export function createSaveData(): SaveData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    playerId: '',
    createdAtUnix: 0,
    lastSeenAtUnix: 0,
    lastServerSeenAtUnix: -1,
    economyVersion: 1,
    clientVersion: '0.1.0',
    player: {
      playerId: '',
      cashBalance: { amountMinorUnits: 0 } as never,
      businessRank: 1,
      maxCompanies: 3,
      holdingCompanyId: '',
      onboardingCompleted: false,
      activeLoans: [],
    },
    companies: [],
    marketState: {},
    activityCooldowns: {},
    purchases: { entitlements: [], lastValidatedAtUnix: 0 },
    settings: {},
    checksum: '',
    signatureVersion: 1,
  };
}

export function migrateSavePayload(rawPayload: Record<string, unknown>): Record<string, unknown> {
  let version = Number(rawPayload.schema_version ?? 0);
  const migrated = JSON.parse(JSON.stringify(rawPayload)) as Record<string, unknown>;

  while (version < CURRENT_SCHEMA_VERSION) {
    switch (version) {
      case 0:
        if (!migrated.schema_version) {
          migrated.schema_version = 1;
        }
        if (!migrated.integrity) {
          migrated.integrity = { checksum: '', signature_version: 1 };
        }
        version = 1;
        break;
      case 1: {
        const state = (migrated.state as Record<string, unknown>) ?? {};
        const player = (state.player as Record<string, unknown>) ?? {};
        if (!player.holding_company_id) {
          player.holding_company_id = '';
        }
        if (player.onboarding_completed === undefined) {
          player.onboarding_completed = false;
        }
        const companies = (state.companies as Record<string, unknown>[]) ?? [];
        for (const company of companies) {
          if (!company.company_kind) {
            company.company_kind = CompanyKinds.SUBSIDIARY;
          }
        }
        if (!state.activity_cooldowns) {
          state.activity_cooldowns = {};
        }
        state.player = player;
        state.companies = companies;
        migrated.state = state;
        version = 2;
        break;
      }
      case 2: {
        const state = (migrated.state as Record<string, unknown>) ?? {};
        const player = (state.player as Record<string, unknown>) ?? {};
        if (!player.active_loans) {
          player.active_loans = [];
        }
        const companies = (state.companies as Record<string, unknown>[]) ?? [];
        for (const company of companies) {
          if (!company.manager_id) {
            company.manager_id = '';
          }
        }
        state.player = player;
        state.companies = companies;
        migrated.state = state;
        version = 3;
        break;
      }
      case 3: {
        const state = (migrated.state as Record<string, unknown>) ?? {};
        if (!state.purchases) {
          state.purchases = { entitlements: [], last_validated_at_unix: 0 };
        }
        migrated.state = state;
        version = 4;
        break;
      }
      case 4: {
        const state = (migrated.state as Record<string, unknown>) ?? {};
        const companies = (state.companies as Record<string, unknown>[]) ?? [];
        for (const company of companies) {
          if (!company.upgrade_track_levels) {
            company.upgrade_track_levels = {};
          }
        }
        state.companies = companies;
        migrated.state = state;
        version = 5;
        break;
      }
      case 5: {
        const state = (migrated.state as Record<string, unknown>) ?? {};
        const companies = (state.companies as Record<string, unknown>[]) ?? [];
        for (const company of companies) {
          const legacyManager = String(company.manager_id ?? '');
          const executiveHires =
            (company.executive_hires as Record<string, boolean> | undefined) ?? {};
          if (legacyManager && !executiveHires[legacyManager]) {
            executiveHires[legacyManager] = true;
          }
          company.executive_hires = executiveHires;
          if (company.lifetime_profit_minor === undefined) {
            company.lifetime_profit_minor = 0;
          }
          delete company.manager_id;
        }
        state.companies = companies;
        migrated.state = state;
        version = 6;
        break;
      }
      case 6: {
        const state = (migrated.state as Record<string, unknown>) ?? {};
        const companies = (state.companies as Record<string, unknown>[]) ?? [];
        const lastSeenRaw = migrated.last_seen_at;
        let anchorUnix = Math.floor(Date.now() / 1000);
        if (lastSeenRaw) {
          const iso = String(lastSeenRaw);
          anchorUnix = Math.floor(
            new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime() / 1000,
          );
        }

        for (const company of companies) {
          const executiveHires =
            (company.executive_hires as Record<string, boolean> | undefined) ?? {};
          const executiveContracts: Record<string, { expires_at_unix: number }> = {};
          for (const [roleId, hired] of Object.entries(executiveHires)) {
            if (hired) {
              executiveContracts[roleId] = { expires_at_unix: anchorUnix + 72 * 3600 };
            }
          }
          company.executive_contracts = executiveContracts;
          delete company.executive_hires;
          if (company.payroll_level === undefined) {
            company.payroll_level = 1;
          }
        }
        state.companies = companies;
        migrated.state = state;
        version = 7;
        break;
      }
      default:
        throw new Error(`Unsupported save schema version: ${version}`);
    }
    migrated.schema_version = version;
  }

  return migrated;
}
