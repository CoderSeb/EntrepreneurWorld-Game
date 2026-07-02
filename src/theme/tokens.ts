/** Figma design tokens — see docs/DESIGN_SYSTEM.md */

export const colors = {
  background: '#060b14',
  backgroundDeep: '#020509',
  surface: '#0b1322',
  surfaceMuted: '#111c30',
  primary: '#00e5ff',
  text: '#e2eaf5',
  textSecondary: '#c0cfe0',
  muted: '#5a7a9a',
  border: '#1a2a40',
  borderPrimary: 'rgba(0, 229, 255, 0.12)',
  success: '#00ff88',
  warning: '#f5a623',
  danger: '#ff3366',
  accentPurple: '#7b61ff',
  highUrgency: '#ff7b00',
} as const;

export const sectorColors = {
  tech: '#00e5ff',
  health: '#00ff88',
  energy: '#f5a623',
  logistics: '#7b61ff',
  media: '#ff6b9d',
  finance: '#ffd700',
} as const;

export const urgencyColors = {
  low: colors.muted,
  medium: colors.warning,
  high: colors.highUrgency,
  critical: colors.danger,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const radii = {
  sm: 4,
  md: 6,
  lg: 8,
  pill: 44,
} as const;
