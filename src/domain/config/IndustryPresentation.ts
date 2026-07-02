import { IndustryDefinition } from '@/domain/config/EconomyConfig';
import { colors } from '@/theme/tokens';

export type IndustryPresentation = {
  iconName: string;
  tagline: string;
  focusHint: string;
  accentColor: string;
  marginPercent: number;
  riskLabel: string;
  automationPercent: number;
  statsLine: string;
};

const FALLBACK_COLORS = [
  colors.primary,
  colors.success,
  colors.warning,
  colors.accentPurple,
  colors.danger,
  '#f59e0b',
];

function hashIndustryId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function fallbackAccentColor(industryId: string): string {
  return FALLBACK_COLORS[hashIndustryId(industryId) % FALLBACK_COLORS.length];
}

export function riskLabelFromProfile(riskProfile: number): string {
  if (riskProfile <= 0.25) {
    return 'Low';
  }
  if (riskProfile <= 0.45) {
    return 'Med';
  }
  return 'High';
}

function derivedTagline(industry: IndustryDefinition): string {
  const margin =
    industry.baseRevenuePerHourMinor > 0
      ? ((industry.baseRevenuePerHourMinor - industry.baseExpensesPerHourMinor) /
          industry.baseRevenuePerHourMinor) *
        100
      : 0;
  const risk = riskLabelFromProfile(industry.riskProfile);
  if (margin >= 40 && industry.automationPotential >= 0.7) {
    return 'High growth potential';
  }
  if (risk === 'Low') {
    return 'Stable returns';
  }
  if (industry.automationPotential >= 0.6) {
    return 'Automation-friendly';
  }
  return 'Balanced operations';
}

function derivedFocusHint(industry: IndustryDefinition): string {
  if (industry.automationPotential >= 0.7) {
    return 'Invest in automation and executives';
  }
  if (industry.riskProfile >= 0.5) {
    return 'Watch cash flow and marketing';
  }
  return 'Balance revenue upgrades and tasks';
}

export function resolveIndustryPresentation(industry: IndustryDefinition): IndustryPresentation {
  const marginPercent =
    industry.baseRevenuePerHourMinor > 0
      ? Math.round(
          ((industry.baseRevenuePerHourMinor - industry.baseExpensesPerHourMinor) /
            industry.baseRevenuePerHourMinor) *
            100,
        )
      : 0;
  const riskLabel = riskLabelFromProfile(industry.riskProfile);
  const automationPercent = Math.round(industry.automationPotential * 100);
  const tagline = industry.tagline.trim() || derivedTagline(industry);
  const focusHint = industry.focusHint.trim() || derivedFocusHint(industry);
  const accentColor = industry.accentColor.trim() || fallbackAccentColor(industry.id);

  return {
    iconName: industry.iconName || 'business',
    tagline,
    focusHint,
    accentColor,
    marginPercent,
    riskLabel,
    automationPercent,
    statsLine: `${marginPercent}% margin · ${riskLabel} risk · ${automationPercent}% auto`,
  };
}
