import { ExecutiveAutomationPolicy } from '@/domain/companies/ExecutivePolicyService';
import type { TranslationDictionary } from '@/i18n/types';

const POLICY_KEYS: Record<ExecutiveAutomationPolicy, keyof TranslationDictionary['company']> = {
  balanced: 'policyBalanced',
  aggressive_growth: 'policyAggressiveGrowth',
  cost_control: 'policyCostControl',
  quality_first: 'policyQualityFirst',
  cash_reserve: 'policyCashReserve',
};

export function getAutomationPolicyLabel(
  policy: ExecutiveAutomationPolicy,
  translations: TranslationDictionary,
): string {
  return translations.company[POLICY_KEYS[policy]];
}

export function getAutomationPolicyShortLabel(policy: ExecutiveAutomationPolicy): string {
  return policy.replace(/_/g, ' ');
}
