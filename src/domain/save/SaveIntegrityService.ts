import * as Crypto from 'expo-crypto';
import { SaveData } from '@/domain/save/SaveData';
import { saveDataToDictionary } from '@/domain/save/SaveSerializer';

export const SAVE_INTEGRITY_SALT = 'business-empire-local-save-v1';

function canonicalPayload(saveData: SaveData): Record<string, unknown> {
  const payload = saveDataToDictionary(saveData);
  delete payload.integrity;
  return payload;
}

export async function computeChecksum(payloadWithoutIntegrity: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(payloadWithoutIntegrity);
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical + SAVE_INTEGRITY_SALT);
}

export async function attachChecksum(saveData: SaveData): Promise<void> {
  saveData.checksum = await computeChecksum(canonicalPayload(saveData));
}

export async function verifyChecksum(saveData: SaveData): Promise<boolean> {
  if (!saveData.checksum) {
    return false;
  }
  const payload = saveDataToDictionary(saveData);
  const stored = String((payload.integrity as Record<string, unknown>)?.checksum ?? '');
  delete payload.integrity;
  const computed = await computeChecksum(payload as Record<string, unknown>);
  return computed === stored;
}
