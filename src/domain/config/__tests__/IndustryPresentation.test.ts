import { parseEconomyConfig } from '@/domain/config/EconomyConfig';
import { resolveIndustryPresentation, riskLabelFromProfile } from '@/domain/config/IndustryPresentation';
import economyJson from '../../../../assets/config/economy_config_v1.json';

const config = parseEconomyConfig(economyJson as never);

describe('IndustryPresentation', () => {
  it('loads bundled economy config v7 industry UI fields', () => {
    expect(config.version).toBe(7);
    const cafe = config.industries.cafe;
    expect(cafe.iconName).toBe('cafe');
    expect(cafe.tagline).toBe('Steady foot traffic');
    expect(cafe.focusHint).toContain('Operations');
    expect(cafe.accentColor).toBe('#f5a623');
    expect(cafe.preferredTrackId).toBe('operations');
  });

  it('derives stats line from industry economics', () => {
    const presentation = resolveIndustryPresentation(config.industries.cafe);
    expect(presentation.marginPercent).toBe(42);
    expect(presentation.riskLabel).toBe('Low');
    expect(presentation.automationPercent).toBe(50);
    expect(presentation.statsLine).toContain('42% margin');
  });

  it('falls back when optional UI fields are missing', () => {
    const minimal = {
      ...config.industries.cafe,
      iconName: '',
      tagline: '',
      focusHint: '',
      accentColor: '',
    };
    const presentation = resolveIndustryPresentation(minimal);
    expect(presentation.iconName).toBe('business');
    expect(presentation.tagline.length).toBeGreaterThan(0);
    expect(presentation.focusHint.length).toBeGreaterThan(0);
    expect(presentation.accentColor.length).toBeGreaterThan(0);
  });

  it('maps risk profile to labels', () => {
    expect(riskLabelFromProfile(0.15)).toBe('Low');
    expect(riskLabelFromProfile(0.35)).toBe('Med');
    expect(riskLabelFromProfile(0.55)).toBe('High');
  });
});
