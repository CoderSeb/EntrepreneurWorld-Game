import { SaveData } from '@/domain/save/SaveData';
import { migrateSavePayload } from '@/domain/save/SaveData';
import { saveDataFromDictionary, saveDataToDictionary } from '@/domain/save/SaveSerializer';
import { verifyChecksum } from '@/domain/save/SaveIntegrityService';
import { CloudSaveResponse, CloudSaveUploadRequest } from '@/services/api/types';

export function cloudUpdatedAtUnix(updatedAt: string): number {
  return Math.floor(new Date(updatedAt).getTime() / 1000);
}

export function localSaveUpdatedAtUnix(saveData: SaveData): number {
  return saveData.lastSeenAtUnix > 0 ? saveData.lastSeenAtUnix : saveData.createdAtUnix;
}

export type CloudSavePickResult =
  | { winner: 'cloud'; saveData: SaveData }
  | { winner: 'local'; saveData: SaveData | null }
  | { winner: 'none'; saveData: null };

/** Decide whether cloud or local save should be applied before offline progress. */
export async function pickSaveBeforeOffline(
  localSave: SaveData | null,
  cloudSave: CloudSaveResponse | null,
): Promise<CloudSavePickResult> {
  if (!cloudSave && !localSave) {
    return { winner: 'none', saveData: null };
  }

  if (!cloudSave) {
    return { winner: 'local', saveData: localSave };
  }

  if (!localSave) {
    const parsed = await parseCloudSaveResponse(cloudSave);
    return parsed ? { winner: 'cloud', saveData: parsed } : { winner: 'none', saveData: null };
  }

  const cloudUnix = cloudUpdatedAtUnix(cloudSave.updatedAt);
  const localUnix = localSaveUpdatedAtUnix(localSave);

  if (cloudUnix > localUnix) {
    const parsed = await parseCloudSaveResponse(cloudSave);
    return parsed ? { winner: 'cloud', saveData: parsed } : { winner: 'local', saveData: localSave };
  }

  return { winner: 'local', saveData: localSave };
}

export async function parseCloudSaveResponse(cloudSave: CloudSaveResponse): Promise<SaveData | null> {
  try {
    const payload = JSON.parse(cloudSave.payloadJson) as Record<string, unknown>;
    const migrated = migrateSavePayload(payload);
    const saveData = saveDataFromDictionary(migrated);
    if (!(await verifyChecksum(saveData))) {
      return null;
    }
    saveData.lastServerSeenAtUnix = cloudUpdatedAtUnix(cloudSave.updatedAt);
    return saveData;
  } catch {
    return null;
  }
}

export function buildCloudUploadRequest(saveData: SaveData): CloudSaveUploadRequest {
  const payload = saveDataToDictionary(saveData);
  return {
    schemaVersion: saveData.schemaVersion,
    economyVersion: saveData.economyVersion,
    clientVersion: saveData.clientVersion,
    payloadJson: JSON.stringify(payload),
    checksum: saveData.checksum,
    updatedAt: new Date(saveData.lastSeenAtUnix * 1000).toISOString(),
  };
}

export function shouldUploadLocalToCloud(
  localSave: SaveData,
  cloudSave: CloudSaveResponse | null,
): boolean {
  if (!cloudSave) {
    return true;
  }
  return localSaveUpdatedAtUnix(localSave) > cloudUpdatedAtUnix(cloudSave.updatedAt);
}
