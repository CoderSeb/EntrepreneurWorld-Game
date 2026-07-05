import {
  BACKGROUND_CLOUD_UPLOAD_INTERVAL_SECONDS,
  buildCloudSyncPresentation,
  computeNextSyncPlannedAtUnix,
  deriveLastSyncStatus,
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
  it('reports success while local changes wait for the upload throttle', () => {
    expect(deriveLastSyncStatus(createStatus(), false)).toBe('success');
  });

  it('plans the next automatic sync while local changes are queued', () => {
    const nowUnix = 1_030;
    const planned = computeNextSyncPlannedAtUnix(nowUnix, createStatus(), true, false);
    expect(planned).toBe(1_000 + BACKGROUND_CLOUD_UPLOAD_INTERVAL_SECONDS);
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
    const presentation = buildCloudSyncPresentation(createStatus(), true, false, 1_030);
    expect(presentation.lastSyncStatus).toBe('success');
    expect(presentation.nextSyncPlannedAtUnix).toBe(1_120);
    expect(presentation.canSyncNow).toBe(true);
  });
});
