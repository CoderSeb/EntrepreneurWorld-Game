import { migrateSavePayload, CURRENT_SCHEMA_VERSION } from '@/domain/save/SaveData';
import {
  attachChecksumSyncForTests,
  verifyChecksumSyncForTests,
} from '@/domain/save/__tests__/saveIntegrityTestHelpers';
import { saveDataFromDictionary, saveDataToDictionary } from '@/domain/save/SaveSerializer';
import { createPlayerState } from '@/domain/core/PlayerState';
import { MoneyValue } from '@/domain/money/MoneyValue';

describe('SaveMigrationService', () => {
  it('migrates schema 0 payload to current version', () => {
    const migrated = migrateSavePayload({
      schema_version: 0,
      state: {
        player: { cash_balance_minor: 100 },
        companies: [{ id: 'c1', name: 'Legacy' }],
      },
    });
    expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    const saveData = saveDataFromDictionary(migrated);
    expect(saveData.player.personalCashBalance.amountMinorUnits).toBe(100);
  });

  it('migrates schema 6 executive_hires to executive_contracts', () => {
    const migrated = migrateSavePayload({
      schema_version: 6,
      last_seen_at: '2026-07-01T12:00:00Z',
      state: {
        companies: [
          {
            executive_hires: { cmo: true, cfo: false },
            employee_count: 3,
          },
        ],
      },
    });

    expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    const company = ((migrated.state as Record<string, unknown>).companies as Record<string, unknown>[])[0];
    const contracts = company.executive_contracts as Record<string, { expires_at_unix: number }>;
    expect(contracts.cmo.expires_at_unix).toBeGreaterThan(1_700_000_000);
    expect(contracts.cfo).toBeUndefined();
    expect(company.payroll_level).toBe(1);
    expect(company.executive_hires).toBeUndefined();

    const saveData = saveDataFromDictionary(migrated);
    expect(saveData.companies[0]?.executiveContracts.cmo).toBeDefined();
    expect(saveData.companies[0]?.payrollLevel).toBe(1);
  });

  it('migrates schema 7 legacy player cash into holding treasury', () => {
    const migrated = migrateSavePayload({
      schema_version: 7,
      state: {
        player: { cash_balance_minor: 1_000_000 },
        companies: [{ company_kind: 'holding', cash_balance_minor: 50_000 }],
      },
    });

    expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    const saveData = saveDataFromDictionary(migrated);
    expect(saveData.player.personalCashBalance.amountMinorUnits).toBe(0);
    expect(saveData.companies[0]?.cashBalance.amountMinorUnits).toBe(1_050_000);
  });

  it('migrates schema 9 to v10 executive policy and integration fields', () => {
    const migrated = migrateSavePayload({
      schema_version: 9,
      state: {
        companies: [{ id: 'c1', active_effects: [] }],
        market: { active_events: [] },
      },
    });

    expect(migrated.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    const company = ((migrated.state as Record<string, unknown>).companies as Record<string, unknown>[])[0];
    expect(company.automation_policy).toBe('balanced');
    expect(company.integration_debt_minor).toBe(0);
    expect(company.integration_complete).toBe(true);

    const market = (migrated.state as Record<string, unknown>).market as Record<string, unknown>;
    expect(market.market_signals).toEqual([]);
  });
});

describe('SaveIntegrityService', () => {
  it('attaches and verifies checksum', () => {
    const saveData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      playerId: 'p1',
      createdAtUnix: 1,
      lastSeenAtUnix: 2,
      lastServerSeenAtUnix: -1,
      economyVersion: 4,
      clientVersion: '0.1.0',
      player: createPlayerState(),
      companies: [],
      marketState: {},
      activityCooldowns: {},
      purchases: { entitlements: [], lastValidatedAtUnix: 0 },
      settings: {},
      checksum: '',
      signatureVersion: 1,
    };
    saveData.player.personalCashBalance = MoneyValue.fromMinor(5000000);
    attachChecksumSyncForTests(saveData);
    expect(verifyChecksumSyncForTests(saveData)).toBe(true);

    const payload = saveDataToDictionary(saveData);
    expect(payload.integrity).toEqual(
      expect.objectContaining({ checksum: expect.any(String) }),
    );
  });
});
