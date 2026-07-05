import {
  BACKGROUND_CLOUD_UPLOAD_INTERVAL_SECONDS,
  buildCloudSyncPresentation,
  deriveCloudSyncStatus,
  shouldScheduleCloudUpload,
} from '@/services/backend/CloudSyncPresentation';
import { BackendStatus } from '@/services/backend/BackendBootstrapService';

function createStatus(overrides: Partial<BackendStatus> = {}): BackendStatus {
  return {
    enabled: true,
    connected: true,
    playerId: 'player-1',
    profileStatus: 'active',
    cloudSaveEnabled: true,
    economyConfigSource: 'bundled',
    lastSyncAtUnix: 1_000,
    lastError: null,
    welcomeTitle: null,
    ...overrides,
  };
}

describe('CloudSyncPresentation', () => {
  it('derives synced when connected and not dirty', () => {
    expect(deriveCloudSyncStatus(createStatus(), false, false)).toBe('synced');
  });

  it('derives pending when local changes are not uploaded yet', () => {
    expect(deriveCloudSyncStatus(createStatus(), true, false)).toBe('pending');
  });

  it('throttles background uploads until the interval passes', () => {
    const lastSync = 1_000;
    expect(shouldScheduleCloudUpload(lastSync + 30, lastSync, true, false)).toBe(false);
    expect(
      shouldScheduleCloudUpload(
        lastSync + BACKGROUND_CLOUD_UPLOAD_INTERVAL_SECONDS,
        lastSync,
        true,
        false,
      ),
    ).toBe(true);
  });

  it('forces upload on app background', () => {
    expect(shouldScheduleCloudUpload(1_030, 1_000, true, true)).toBe(true);
  });

  it('builds presentation with sync action when cloud save is available', () => {
    const presentation = buildCloudSyncPresentation(createStatus(), false, false);
    expect(presentation.status).toBe('synced');
    expect(presentation.canSyncNow).toBe(true);
  });
});
