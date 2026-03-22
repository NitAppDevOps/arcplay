/** Central colour palette — never hardcode hex values elsewhere in the codebase */
export const COLOURS = {
  // Brand
  PRIMARY: '#6C47FF',
  PRIMARY_DARK: '#4F2FD9',
  PRIMARY_LIGHT: '#EDE9FF',

  // Backgrounds
  BACKGROUND: '#0E0E14',
  SURFACE: '#1A1A24',
  SURFACE_ELEVATED: '#24243A',

  // Text
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#A0A0B8',
  TEXT_MUTED: '#5A5A7A',

  // Status
  SUCCESS: '#22C55E',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',

  // Game board
  BOARD_LIGHT: '#F0D9B5',
  BOARD_DARK: '#B58863',
  BOARD_HIGHLIGHT: '#CDD16E',
  BOARD_SELECTED: '#7FC97F',

  // Borders
  BORDER: '#2A2A3E',
  BORDER_LIGHT: '#3A3A54',

  // Overlays
  OVERLAY: 'rgba(0,0,0,0.6)',
  OVERLAY_LIGHT: 'rgba(0,0,0,0.3)',
} as const;

export type ColourKey = keyof typeof COLOURS;