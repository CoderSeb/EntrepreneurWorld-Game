import type { TranslationDictionary } from '@/i18n/types';

const INDUSTRY_IDS = [
  'cafe',
  'cleaning',
  'auto_repair',
  'ecommerce',
  'software',
  'real_estate',
] as const;

export type IndustryId = (typeof INDUSTRY_IDS)[number];

export function isKnownIndustryId(value: string): value is IndustryId {
  return (INDUSTRY_IDS as readonly string[]).includes(value);
}

export function getIndustryLabel(industryId: string, t: TranslationDictionary): string {
  if (isKnownIndustryId(industryId)) {
    return t.industries[industryId];
  }
  return industryId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
