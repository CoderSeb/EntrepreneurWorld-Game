import { attachChecksum, verifyChecksum } from '@/domain/save/SaveIntegrityService';
import { migrateSavePayload, SaveData } from '@/domain/save/SaveData';
import { saveDataFromDictionary } from '@/domain/save/SaveSerializer';

export async function loadSaveDataFromPayload(
  parsed: Record<string, unknown>,
): Promise<SaveData | null> {
  const rawSchemaVersion = Number(parsed.schema_version ?? 0);
  const migrated = migrateSavePayload(parsed);
  const saveData = saveDataFromDictionary(migrated);
  const wasMigrated = rawSchemaVersion !== saveData.schemaVersion;

  if (!wasMigrated && !(await verifyChecksum(saveData))) {
    return null;
  }

  if (wasMigrated) {
    await attachChecksum(saveData);
  }

  return saveData;
}
