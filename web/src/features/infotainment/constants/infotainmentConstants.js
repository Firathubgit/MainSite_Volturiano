/**
 * Infotainment Constants
 * Translated from volturiano-os/constants.ts and types.ts
 */

// Drive Modes
export const DRIVE_MODES = {
  SPORT: 'SPORT',
  COMFORT: 'COMFORT',
  LUXURY: 'LUXURY',
};

// Camera Views
export const CAMERA_VIEWS = {
  DEFAULT: 'DEFAULT',
  SIDE: 'SIDE',
  REAR: 'REAR',
  TOP: 'TOP',
};

// App IDs
export const APP_IDS = {
  CAR: 'CAR',
  NAV: 'NAV',
  MEDIA: 'MEDIA',
  CLIMATE: 'CLIMATE',
  ENERGY: 'ENERGY',
  SETTINGS: 'SETTINGS',
};

// Theme configurations per drive mode
export const THEMES = {
  [DRIVE_MODES.SPORT]: {
    primary: '#FF4520',
    secondary: '#E10600',
    gradient: 'bg-sport-gradient',
    glow: 'shadow-[0_0_40px_rgba(255,69,32,0.25)]',
    label: 'SPORT DYNAMIC',
    auraColor: 'rgba(225, 6, 0, 0.25)',
  },
  [DRIVE_MODES.COMFORT]: {
    primary: '#0036FF',
    secondary: '#6BAFFF',
    gradient: 'bg-comfort-gradient',
    glow: 'shadow-[0_0_40px_rgba(0,54,255,0.2)]',
    label: 'COMFORT CRUISE',
    auraColor: 'rgba(107, 175, 255, 0.15)',
  },
  [DRIVE_MODES.LUXURY]: {
    primary: '#D9D9D9',
    secondary: '#A8A8A8',
    gradient: 'bg-luxury-gradient',
    glow: 'shadow-[0_0_40px_rgba(217,217,217,0.15)]',
    label: 'GRAND TOURING',
    auraColor: 'rgba(217, 217, 217, 0.1)',
  },
};

// Car Paint Options
export const CAR_PAINTS = [
  { name: 'Satin Black', value: '#1A1A1A' },
  { name: 'Volturiano Orange', value: '#FF4520' },
  { name: 'Ice White', value: '#EAEAEA' },
  { name: 'Phantom Grey', value: '#2C2C2C' },
  { name: 'Midnight Blue', value: '#0A0A2A' },
];

// Rim Color Options
export const RIM_COLORS = [
  { name: 'Chrome', value: '#D9D9D9' },
  { name: 'Matte Black', value: '#111111' },
  { name: 'Gold', value: '#AA8844' },
];

// Default car configuration
export const DEFAULT_CAR_CONFIG = {
  color: CAR_PAINTS[0].value,
  rimColor: RIM_COLORS[1].value,
};
