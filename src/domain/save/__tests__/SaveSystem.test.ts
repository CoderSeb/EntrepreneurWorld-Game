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
    expect(saveData.player.cashBalance.amountMinorUnits).toBe(100);
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
    saveData.player.cashBalance = MoneyValue.fromMinor(5000000);
    attachChecksumSyncForTests(saveData);
    expect(verifyChecksumSyncForTests(saveData)).toBe(true);

    const payload = saveDataToDictionary(saveData);
    expect(payload.integrity).toEqual(
      expect.objectContaining({ checksum: expect.any(String) }),
    );
  });
});
