import { attachChecksum, verifyChecksum } from '@/domain/save/SaveIntegrityService';
import { migrateSavePayload, SaveData } from '@/domain/save/SaveData';
import { saveDataFromDictionary } from '@/domain/save/SaveSerializer';

export function payloadHasIntegrityChecksum(parsed: Record<string, unknown>): boolean {
  const integrity = parsed.integrity;
  if (integrity == null || typeof integrity !== 'object') {
    return false;
  }

  const checksum = (integrity as Record<string, unknown>).checksum;
  return typeof checksum === 'string' && checksum.length > 0;
}

export async function loadSaveDataFromPayload(
  parsed: Record<string, unknown>,
): Promise<SaveData | null> {
  const rawSchemaVersion = Number(parsed.schema_version ?? 0);
  const hadIntegrityChecksum = payloadHasIntegrityChecksum(parsed);

  if (hadIntegrityChecksum) {
    const rawSaveData = saveDataFromDictionary(parsed);
    if (!(await verifyChecksum(rawSaveData))) {
      return null;
    }
  } else {
    const migratedPreview = migrateSavePayload(parsed);
    const previewVersion = Number(migratedPreview.schema_version ?? 0);
    const willMigrate = rawSchemaVersion !== previewVersion;
    if (!willMigrate) {
      return null;
    }
  }

  const migrated = migrateSavePayload(parsed);
  const saveData = saveDataFromDictionary(migrated);
  const wasMigrated = rawSchemaVersion !== saveData.schemaVersion;

  if (wasMigrated) {
    await attachChecksum(saveData);
  }

  return saveData;
}
