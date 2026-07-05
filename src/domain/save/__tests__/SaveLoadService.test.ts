import { createPlayerState } from '@/domain/core/PlayerState';
import { MoneyValue } from '@/domain/money/MoneyValue';
import { CURRENT_SCHEMA_VERSION } from '@/domain/save/SaveData';
import {
  attachChecksumSyncForTests,
  verifyChecksumSyncForTests,
} from '@/domain/save/__tests__/saveIntegrityTestHelpers';
import {
  loadSaveDataFromPayload,
  payloadHasIntegrityChecksum,
} from '@/domain/save/SaveLoadService';
import { saveDataToDictionary, saveDataFromDictionary } from '@/domain/save/SaveSerializer';

describe('SaveLoadService', () => {
  it('detects integrity checksum presence on payload', () => {
    expect(payloadHasIntegrityChecksum({ integrity: { checksum: 'abc' } })).toBe(true);
    expect(payloadHasIntegrityChecksum({ integrity: {} })).toBe(false);
    expect(payloadHasIntegrityChecksum({})).toBe(false);
  });

  it('rejects tampered current-schema saves that have a checksum', async () => {
    const saveData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      playerId: 'p1',
      createdAtUnix: 1,
      lastSeenAtUnix: 2,
      lastServerSeenAtUnix: -1,
      economyVersion: 10,
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
    saveData.player.personalCashBalance = MoneyValue.fromMinor(5_000_000);
    attachChecksumSyncForTests(saveData);

    const payload = saveDataToDictionary(saveData);
    const player = (payload.state as Record<string, unknown>).player as Record<string, unknown>;
    player.personal_cash_balance_minor = 1;

    await expect(loadSaveDataFromPayload(payload)).resolves.toBeNull();
  });

  it('rejects tampered legacy saves that had a checksum before migration', async () => {
    const payload = {
      schema_version: 9,
      economy_version: 10,
      client_version: '0.1.0',
      created_at: '2026-01-01T00:00:00Z',
      last_seen_at: '2026-01-02T00:00:00Z',
      last_server_seen_at: null,
      state: {
        player: {
          player_id: 'p1',
          personal_cash_balance_minor: 100_000,
          business_rank: 1,
          max_companies: 3,
          holding_company_id: '',
          onboarding_completed: false,
          active_loans: [],
        },
        companies: [
          {
            id: 'c1',
            name: 'Cafe',
            company_kind: 'subsidiary',
            industry_id: 'cafe',
            level: 1,
            cash_balance_minor: 0,
            reputation: 0,
            automation_level: 0,
            executive_contracts: {},
            active_effects: [],
            lifetime_profit_minor: 0,
            employee_count: 1,
            payroll_level: 1,
            revenue_per_hour_minor: 120_000,
            expenses_per_hour_minor: 70_000,
            risk_level: 0.2,
            upgrade_track_levels: {},
            created_at_unix: 1,
            updated_at_unix: 1,
          },
        ],
        market: { active_events: [] },
        activity_cooldowns: {},
        purchases: { entitlements: [], last_validated_at_unix: 0 },
        settings: {},
      },
    };

    const saveData = saveDataFromDictionary(payload);
    attachChecksumSyncForTests(saveData);
    const signedPayload = saveDataToDictionary(saveData);
    const player = (signedPayload.state as Record<string, unknown>).player as Record<string, unknown>;
    player.personal_cash_balance_minor = 1;

    await expect(loadSaveDataFromPayload(signedPayload)).resolves.toBeNull();
  });

  it('migrates pre-integrity legacy saves without rejecting them', async () => {
    const payload = {
      schema_version: 9,
      economy_version: 10,
      client_version: '0.1.0',
      created_at: '2026-01-01T00:00:00Z',
      last_seen_at: '2026-01-02T00:00:00Z',
      last_server_seen_at: null,
      state: {
        companies: [{ id: 'c1', active_effects: [] }],
        market: { active_events: [] },
      },
    };

    const loaded = await loadSaveDataFromPayload(payload);
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    attachChecksumSyncForTests(loaded!);
    expect(verifyChecksumSyncForTests(loaded!)).toBe(true);
  });
});
