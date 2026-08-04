/**
 * Semantic design tokens — synced with the AZM Mindmap web app's
 * space/dark identity (artifacts/quiet-mindmap). The app is dark-only:
 * both palettes carry the same deep-space values so system appearance
 * never flips it to a light theme.
 */

const space = {
  text: '#e2e8f0',
  tint: '#a78bfa',

  // Core surfaces — deep space navy/black
  background: '#070a14',
  foreground: '#e2e8f0',

  // Cards / elevated surfaces
  card: '#10152a',
  cardForeground: '#e2e8f0',

  // Primary action color (violet nebula, matches web accent)
  primary: '#a78bfa',
  primaryForeground: '#0b0e1a',

  // Secondary / less-emphasis interactive surfaces
  secondary: '#1a2140',
  secondaryForeground: '#cbd5e1',

  // Muted / subdued elements
  muted: '#151b33',
  mutedForeground: '#8b93ab',

  // Accent highlights
  accent: '#1e2747',
  accentForeground: '#e2e8f0',

  // Destructive actions
  destructive: '#f87171',
  destructiveForeground: '#0b0e1a',

  // Borders and input outlines
  border: '#232c4d',
  input: '#232c4d',
};

const colors = {
  light: space,
  dark: space,
  radius: 16,
};

export default colors;
