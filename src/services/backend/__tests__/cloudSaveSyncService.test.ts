import { createSaveData } from '@/domain/save/SaveData';
import { attachChecksumSyncForTests } from '@/domain/save/__tests__/saveIntegrityTestHelpers';
import { saveDataToDictionary } from '@/domain/save/SaveSerializer';
import {
  cloudUpdatedAtUnix,
  localSaveUpdatedAtUnix,
  pickSaveBeforeOffline,
  shouldUploadLocalToCloud,
} from '@/services/backend/cloudSaveSyncService';
import { CloudSaveResponse } from '@/services/api/types';
import { SaveData } from '@/domain/save/SaveData';

jest.mock('@/domain/save/SaveIntegrityService', () => {
  const actual = jest.requireActual('@/domain/save/SaveIntegrityService');
  return {
    ...actual,
    verifyChecksum: jest.fn().mockResolvedValue(true),
  };
});

function makeSave(lastSeenAtUnix: number): SaveData {
  const save = createSaveData();
  save.playerId = 'player-1';
  save.player.playerId = 'player-1';
  save.lastSeenAtUnix = lastSeenAtUnix;
  save.createdAtUnix = 1_000;
  attachChecksumSyncForTests(save);
  return save;
}

function makeCloudSave(updatedAt: string, lastSeenAtUnix: number): CloudSaveResponse {
  const save = makeSave(lastSeenAtUnix);
  return {
    schemaVersion: save.schemaVersion,
    playerId: save.playerId,
    economyVersion: save.economyVersion,
    clientVersion: save.clientVersion,
    payloadJson: JSON.stringify(saveDataToDictionary(save)),
    checksum: save.checksum,
    updatedAt,
  };
}

describe('cloudSaveSyncService', () => {
  it('prefers local save when cloud is missing', async () => {
    const local = makeSave(2_000);
    const pick = await pickSaveBeforeOffline(local, null);
    expect(pick.winner).toBe('local');
    expect(pick.saveData).toBe(local);
  });

  it('prefers newer cloud save by updatedAt', async () => {
    const local = makeSave(1_600_000_000);
    const cloud = makeCloudSave('2026-06-30T12:00:00.000Z', 5_000);
    const pick = await pickSaveBeforeOffline(local, cloud);
    expect(pick.winner).toBe('cloud');
  });

  it('keeps local save when it is newer than cloud', async () => {
    const local = makeSave(1_800_000_000);
    const cloud = makeCloudSave('2020-01-01T00:00:00.000Z', 1_000);
    const pick = await pickSaveBeforeOffline(local, cloud);
    expect(pick.winner).toBe('local');
    expect(pick.saveData).toBe(local);
  });

  it('uploads when local is newer than cloud', () => {
    const local = makeSave(1_800_000_000);
    const cloud = makeCloudSave('2020-01-01T00:00:00.000Z', 1_000);
    expect(shouldUploadLocalToCloud(local, cloud)).toBe(true);
  });

  it('uploads when cloud save is missing', () => {
    const local = makeSave(5_000);
    expect(shouldUploadLocalToCloud(local, null)).toBe(true);
  });

  it('converts cloud updatedAt to unix seconds', () => {
    expect(cloudUpdatedAtUnix('2026-01-01T00:00:00.000Z')).toBe(1_767_225_600);
  });

  it('uses lastSeenAtUnix for local comparison when set', () => {
    const save = makeSave(4_000);
    expect(localSaveUpdatedAtUnix(save)).toBe(4_000);
  });
});
