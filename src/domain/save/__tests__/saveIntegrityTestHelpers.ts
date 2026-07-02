import { createHash } from 'crypto';
import { SaveData } from '@/domain/save/SaveData';
import { saveDataToDictionary } from '@/domain/save/SaveSerializer';
import { SAVE_INTEGRITY_SALT } from '@/domain/save/SaveIntegrityService';

function canonicalPayload(saveData: SaveData): Record<string, unknown> {
  const payload = saveDataToDictionary(saveData);
  delete payload.integrity;
  return payload;
}

/** Jest-only synchronous checksum (Node crypto — not bundled in Expo). */
export function computeChecksumSyncForTests(payloadWithoutIntegrity: Record<string, unknown>): string {
  const canonical = JSON.stringify(payloadWithoutIntegrity);
  return createHash('sha256').update(canonical + SAVE_INTEGRITY_SALT).digest('hex');
}

export function attachChecksumSyncForTests(saveData: SaveData): void {
  saveData.checksum = computeChecksumSyncForTests(canonicalPayload(saveData));
}

export function verifyChecksumSyncForTests(saveData: SaveData): boolean {
  if (!saveData.checksum) {
    return false;
  }
  const payload = saveDataToDictionary(saveData);
  const stored = String((payload.integrity as Record<string, unknown>)?.checksum ?? '');
  delete payload.integrity;
  return computeChecksumSyncForTests(payload as Record<string, unknown>) === stored;
}
