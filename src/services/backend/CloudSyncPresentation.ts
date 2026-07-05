import { BackendStatus } from '@/services/backend/BackendBootstrapService';

export const BACKGROUND_CLOUD_UPLOAD_INTERVAL_SECONDS = 120;

export type CloudSyncLastStatus =
  | 'disabled'
  | 'unavailable'
  | 'offline'
  | 'syncing'
  | 'error'
  | 'success';

export type CloudSyncPresentation = {
  lastSyncStatus: CloudSyncLastStatus;
  lastSyncAtUnix: number | null;
  nextSyncPlannedAtUnix: number | null;
  statusMessage: string | null;
  canSyncNow: boolean;
};

export function shouldScheduleCloudUpload(
  nowUnix: number,
  lastSuccessfulSyncAtUnix: number | null,
  dirty: boolean,
  force: boolean,
): boolean {
  if (!dirty) {
    return false;
  }
  if (force) {
    return true;
  }
  if (lastSuccessfulSyncAtUnix == null) {
    return true;
  }
  return nowUnix - lastSuccessfulSyncAtUnix >= BACKGROUND_CLOUD_UPLOAD_INTERVAL_SECONDS;
}

export function deriveLastSyncStatus(
  backendStatus: BackendStatus,
  syncing: boolean,
): CloudSyncLastStatus {
  if (!backendStatus.enabled) {
    return 'disabled';
  }
  if (!backendStatus.connected) {
    return 'offline';
  }
  if (!backendStatus.cloudSaveEnabled) {
    return 'unavailable';
  }
  if (syncing) {
    return 'syncing';
  }
  if (backendStatus.lastError) {
    return 'error';
  }
  return 'success';
}

export function computeNextSyncPlannedAtUnix(
  nowUnix: number,
  backendStatus: BackendStatus,
  dirty: boolean,
  syncing: boolean,
): number | null {
  if (!backendStatus.enabled || !backendStatus.connected || !backendStatus.cloudSaveEnabled) {
    return null;
  }
  if (syncing || !dirty) {
    return null;
  }
  if (backendStatus.lastSyncAtUnix == null) {
    return nowUnix;
  }

  const plannedAt = backendStatus.lastSyncAtUnix + BACKGROUND_CLOUD_UPLOAD_INTERVAL_SECONDS;
  return Math.max(plannedAt, nowUnix);
}

export function lastSyncStatusLabel(
  status: CloudSyncLastStatus,
  labels: {
    success: string;
    syncing: string;
    offline: string;
    unavailable: string;
    disabled: string;
    error: string;
  },
): string {
  switch (status) {
    case 'success':
      return labels.success;
    case 'syncing':
      return labels.syncing;
    case 'offline':
      return labels.offline;
    case 'unavailable':
      return labels.unavailable;
    case 'disabled':
      return labels.disabled;
    case 'error':
      return labels.error;
    default:
      return labels.success;
  }
}

export function buildCloudSyncPresentation(
  backendStatus: BackendStatus,
  dirty: boolean,
  syncing: boolean,
  nowUnix: number = Math.floor(Date.now() / 1000),
): CloudSyncPresentation {
  const lastSyncStatus = deriveLastSyncStatus(backendStatus, syncing);

  return {
    lastSyncStatus,
    lastSyncAtUnix: backendStatus.lastSyncAtUnix,
    nextSyncPlannedAtUnix: computeNextSyncPlannedAtUnix(
      nowUnix,
      backendStatus,
      dirty,
      syncing,
    ),
    statusMessage: backendStatus.lastError,
    canSyncNow:
      backendStatus.enabled
      && backendStatus.cloudSaveEnabled
      && !syncing,
  };
}
