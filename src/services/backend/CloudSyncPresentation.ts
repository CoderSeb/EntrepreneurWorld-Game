import { BackendStatus } from '@/services/backend/BackendBootstrapService';

export type CloudSyncStatus =
  | 'disabled'
  | 'offline'
  | 'unavailable'
  | 'syncing'
  | 'pending'
  | 'synced'
  | 'error';

export const BACKGROUND_CLOUD_UPLOAD_INTERVAL_SECONDS = 120;

export type CloudSyncPresentation = {
  status: CloudSyncStatus;
  lastSyncAtUnix: number | null;
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

export function deriveCloudSyncStatus(
  backendStatus: BackendStatus,
  dirty: boolean,
  syncing: boolean,
): CloudSyncStatus {
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
  if (dirty) {
    return 'pending';
  }
  return 'synced';
}

export function cloudSyncStatusLabel(
  status: CloudSyncStatus,
  labels: {
    synced: string;
    pending: string;
    syncing: string;
    offline: string;
    unavailable: string;
    disabled: string;
    error: string;
  },
): string {
  switch (status) {
    case 'synced':
      return labels.synced;
    case 'pending':
      return labels.pending;
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
      return labels.synced;
  }
}

export function buildCloudSyncPresentation(
  backendStatus: BackendStatus,
  dirty: boolean,
  syncing: boolean,
): CloudSyncPresentation {
  const status = deriveCloudSyncStatus(backendStatus, dirty, syncing);

  return {
    status,
    lastSyncAtUnix: backendStatus.lastSyncAtUnix,
    statusMessage: backendStatus.lastError,
    canSyncNow:
      backendStatus.enabled
      && backendStatus.cloudSaveEnabled
      && !syncing,
  };
}
